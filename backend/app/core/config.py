from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Thrive AI Companion"
    environment: str = "local"
    api_base_url: str = "http://localhost:8000"

    auth0_domain: str = "your-tenant.us.auth0.com"
    auth0_audience: str = "https://thrive-ai-api"
    auth0_issuer: str = "https://your-tenant.us.auth0.com/"

    postgres_dsn: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/thrive_ai"
    redis_url: str = "redis://localhost:6379/0"

    clickhouse_host: str = "localhost"
    clickhouse_port: int = 8123
    clickhouse_user: str = "default"
    clickhouse_password: str = ""
    clickhouse_database: str = "thrive_ai"

    kafka_bootstrap_servers: str = "localhost:9092"
    kafka_topic: str = "thrive-ai-events"
    rabbitmq_url: str = "amqp://guest:guest@localhost:5672/"
    rabbitmq_queue: str = "thrive-ai-events"

    livekit_url: str = "wss://your-livekit-host"
    livekit_api_key: str = ""
    livekit_api_secret: str = ""

    langchain_provider: str = "openai"
    openai_api_key: Optional[str] = None

    ehr_authorize_url: str = "https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize"
    ehr_token_url: str = "https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token"
    ehr_fhir_base_url: str = "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4"
    ehr_client_id: str = ""
    ehr_client_secret: Optional[str] = None
    ehr_redirect_uri: str = "http://localhost:8000/v1/ehr/callback"
    ehr_scopes: str = "openid profile offline_access patient/Observation.read patient/Patient.read"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()  # type: ignore
