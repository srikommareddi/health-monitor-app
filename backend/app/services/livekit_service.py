from ..core.config import settings


def create_livekit_token(room_name: str, participant_name: str) -> str:
    if not settings.livekit_api_key or not settings.livekit_api_secret:
        raise RuntimeError("LiveKit credentials missing. Set LIVEKIT_API_KEY and LIVEKIT_API_SECRET.")
    if not settings.livekit_url or settings.livekit_url == "wss://your-livekit-host":
        raise RuntimeError("LiveKit URL not configured. Set LIVEKIT_URL.")
    try:
        from livekit.api import AccessToken, VideoGrants
    except Exception as exc:
        raise RuntimeError(f"LiveKit SDK not configured. Install the LiveKit server SDK. ({exc})") from exc

    token = (
        AccessToken(settings.livekit_api_key, settings.livekit_api_secret)
        .with_identity(participant_name)
        .with_name(participant_name)
        .with_grants(VideoGrants(room_join=True, room=room_name))
    )
    return token.to_jwt()
