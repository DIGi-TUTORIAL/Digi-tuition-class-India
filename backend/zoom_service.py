import httpx
import os
import logging
from datetime import datetime, timedelta
from typing import Optional

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
            response.raise_for_status()
            token_data = response.json()
            self.access_token = token_data["access_token"]
            expires_in = token_data.get("expires_in", 3600)
            self.token_expiry = datetime.now() + timedelta(seconds=expires_in - 60)
            logger.info("Obtained new Zoom access token")

    async def create_meeting(self, topic: str, start_time: str, duration: int = 60) -> dict:
        if not self.is_configured():
            raise Exception("Zoom API not configured")

        access_token = await self.get_access_token()
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        # Format start_time for Zoom API (strip milliseconds)
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

zoom_manager = ZoomTokenManager()
