import os
import logging
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

logger = logging.getLogger(__name__)

def send_email(to: str, subject: str, html_content: str) -> bool:
    api_key = os.environ.get("SENDGRID_API_KEY", "")
    sender = os.environ.get("SENDER_EMAIL", "")
    if not api_key or not sender:
        logger.warning(f"SendGrid not configured - API key present: {bool(api_key)}, Sender: '{sender}'")
        return False
    try:
        logger.info(f"Sending email to {to} from {sender} - Subject: {subject}")
        message = Mail(from_email=sender, to_emails=to, subject=subject, html_content=html_content)
        sg = SendGridAPIClient(api_key)
        response = sg.send(message)
        logger.info(f"Email sent to {to}: status={response.status_code}")
        if response.status_code == 202:
            return True
        logger.warning(f"Unexpected SendGrid status {response.status_code} for {to}")
        return False
    except Exception as e:
        error_body = getattr(e, 'body', '')
        error_status = getattr(e, 'status_code', '')
        logger.error(f"Failed to send email to {to}: {type(e).__name__}: {e} | status={error_status} | body={error_body}")
        return False

def send_credentials_email(to: str, name: str, role: str, password: str, login_url: str) -> bool:
    subject = "Your DIGI TUTORIAL CLASSES Login Credentials"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #5B21B6; margin: 0;">DIGI TUTORIAL CLASSES</h1>
        <p style="color: #6B7280; margin-top: 5px;">Online Learning Platform</p>
      </div>
      <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
        <h2 style="color: #111827; margin-top: 0;">Welcome, {name}!</h2>
        <p style="color: #4B5563;">Your {role} account has been created. Here are your login details:</p>
        <table style="width: 100%; margin: 16px 0;">
          <tr><td style="padding: 8px 0; color: #6B7280; font-weight: 600;">Email:</td><td style="padding: 8px 0; color: #111827;">{to}</td></tr>
          <tr><td style="padding: 8px 0; color: #6B7280; font-weight: 600;">Temporary Password:</td><td style="padding: 8px 0; color: #5B21B6; font-weight: 700; font-size: 18px;">{password}</td></tr>
        </table>
        <p style="color: #DC2626; font-size: 14px;">You will be required to change your password on first login.</p>
      </div>
      <div style="text-align: center;">
        <a href="{login_url}" style="display: inline-block; background: #5B21B6; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600;">Login Now</a>
      </div>
      <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin-top: 30px;">DIGI TUTORIAL CLASSES - Online Learning Platform</p>
    </div>
    """
    return send_email(to, subject, html)

def send_password_reset_email(to: str, name: str, reset_token: str, frontend_url: str) -> bool:
    reset_link = f"{frontend_url}/reset-password?token={reset_token}"
    subject = "DIGI TUTORIAL CLASSES - Password Reset"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #5B21B6; margin: 0;">DIGI TUTORIAL CLASSES</h1>
      </div>
      <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 24px; margin-bottom: 20px;">
        <h2 style="color: #111827; margin-top: 0;">Password Reset Request</h2>
        <p style="color: #4B5563;">Hi {name}, click the button below to reset your password. This link expires in 1 hour.</p>
      </div>
      <div style="text-align: center;">
        <a href="{reset_link}" style="display: inline-block; background: #5B21B6; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600;">Reset Password</a>
      </div>
      <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin-top: 30px;">If you didn't request this, please ignore this email.</p>
    </div>
    """
    return send_email(to, subject, html)
