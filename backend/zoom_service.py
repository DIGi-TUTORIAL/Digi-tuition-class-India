import httpx
import os
import logging
import asyncio
from datetime import datetime, timedelta
from typing import Optional, List

logger = logging.getLogger(__name__)

class ZoomTokenManager:
    def __init__(self):
        self.client_id = os.environ.get("ZOOM_CLIENT_ID", "")
        self.client_secret = os.environ.get("ZOOM_CLIENT_SECRET", "")
        self.account_id = os.environ.get("ZOOM_ACCOUNT_ID", "")
        self.access_token: Optional[str] = None
        self.token_expiry: Optional[datetime] = None

    def is_configured(self) -> bool:
        return bool(self.client_id and self.client_secret and self.account_id)

    async def get_access_token(self) -> str:
        if self.access_token and self.token_expiry and datetime.now() < self.token_expiry - timedelta(minutes=5):
            return self.access_token
        await self._request_new_token()
        return self.access_token

    async def _request_new_token(self):
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://zoom.us/oauth/token",
                data={
                    "grant_type": "account_credentials",
                    "account_id": self.account_id,
                },
                auth=(self.client_id, self.client_secret),
                timeout=10.0,
            )
            if response.status_code != 200:
                error_data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
                error_reason = error_data.get("reason", error_data.get("error", "Unknown error"))
                logger.error(f"Zoom token request failed: {response.status_code} - {error_reason}")
                raise Exception(f"Zoom authentication failed: {error_reason}")
            token_data = response.json()
            self.access_token = token_data["access_token"]
            expires_in = token_data.get("expires_in", 3600)
            self.token_expiry = datetime.now() + timedelta(seconds=expires_in - 60)
            logger.info("Obtained new Zoom access token")

    async def check_connection(self) -> dict:
        """Check if Zoom is actually connected and working."""
        if not self.is_configured():
            return {"connected": False, "error": "Zoom credentials not configured"}
        try:
            await self.get_access_token()
            return {"connected": True, "error": ""}
        except Exception as e:
            return {"connected": False, "error": str(e)}

    async def create_meeting(self, topic: str, start_time: str, duration: int = 60) -> dict:
        if not self.is_configured():
            raise Exception("Zoom API not configured")

        access_token = await self.get_access_token()
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        try:
            dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            formatted_time = dt.strftime('%Y-%m-%dT%H:%M:%S')
        except ValueError:
            formatted_time = start_time

        payload = {
            "topic": topic,
            "type": 2,
            "start_time": formatted_time,
            "duration": duration,
            "timezone": "UTC",
            "settings": {
                "host_video": True,
                "participant_video": True,
                "join_before_host": True,
                "jbh_time": 0,
                "mute_upon_entry": False,
                "waiting_room": False,
                "audio": "voip",
                "auto_recording": "none"
            }
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.zoom.us/v2/users/me/meetings",
                headers=headers,
                json=payload,
                timeout=15.0,
            )
            response.raise_for_status()
            data = response.json()
            return {
                "meeting_id": data.get("id"),
                "join_url": data.get("join_url"),
                "start_url": data.get("start_url"),
                "password": data.get("password"),
                "topic": data.get("topic")
            }

    async def create_meetings_batch(self, meetings: List[dict], batch_size: int = 10) -> List[dict]:
        """
        Create multiple Zoom meetings with batching and retry logic.
        Each meeting dict: {"topic": str, "start_time": str, "duration": int}
        Returns list of results (success or error per meeting).
        Zoom rate limit: ~30 req/sec for heavy, we use batch_size=10 with 1s delay.
        """
        if not self.is_configured():
            raise Exception("Zoom API not configured")

        results = []
        total = len(meetings)
        logger.info(f"Creating {total} Zoom meetings in batches of {batch_size}")

        for i in range(0, total, batch_size):
            batch = meetings[i:i + batch_size]
            batch_results = await asyncio.gather(
                *[self._create_meeting_with_retry(m) for m in batch],
                return_exceptions=False
            )
            results.extend(batch_results)
            # Rate limit delay between batches
            if i + batch_size < total:
                await asyncio.sleep(1.5)
            logger.info(f"Batch {i // batch_size + 1}: {len(batch)} meetings processed ({i + len(batch)}/{total})")

        return results

    async def _create_meeting_with_retry(self, meeting: dict, max_retries: int = 3) -> dict:
        """Create a single meeting with retry logic."""
        for attempt in range(max_retries):
            try:
                result = await self.create_meeting(
                    topic=meeting["topic"],
                    start_time=meeting["start_time"],
                    duration=meeting.get("duration", 60)
                )
                return {"success": True, "index": meeting.get("index", 0), **result}
            except Exception as e:
                if attempt < max_retries - 1:
                    wait = (attempt + 1) * 2
                    logger.warning(f"Zoom meeting creation failed (attempt {attempt + 1}), retrying in {wait}s: {e}")
                    await asyncio.sleep(wait)
                else:
                    logger.error(f"Zoom meeting creation failed after {max_retries} attempts: {e}")
                    return {"success": False, "index": meeting.get("index", 0), "error": str(e)}

zoom_manager = ZoomTokenManager()
