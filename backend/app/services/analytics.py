from typing import Any, Dict

import clickhouse_connect

from ..core.config import settings


def write_event(event: Dict[str, Any]) -> None:
    try:
        client = clickhouse_connect.get_client(
            host=settings.clickhouse_host,
            port=settings.clickhouse_port,
            username=settings.clickhouse_user,
            password=settings.clickhouse_password,
            database=settings.clickhouse_database,
        )
        client.command(
            """
            CREATE TABLE IF NOT EXISTS thrive_events
            (
                ts DateTime,
                user_id String,
                metric String,
                value Float64,
                trend String
            )
            ENGINE = MergeTree
            ORDER BY (ts, user_id)
            """
        )
        client.insert(
            "thrive_events",
            [
                (
                    event.get("timestamp"),
                    event.get("user_id", "unknown"),
                    event.get("metric_name", "unknown"),
                    float(event.get("metric_value", 0)),
                    event.get("trend", "unknown"),
                )
            ],
            column_names=["ts", "user_id", "metric", "value", "trend"],
        )
        client.close()
    except Exception:
        pass
