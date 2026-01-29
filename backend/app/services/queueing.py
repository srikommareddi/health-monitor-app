import json
from typing import Any, Dict

from kafka import KafkaProducer
import pika

from ..core.config import settings


def publish_event(event: Dict[str, Any]) -> None:
    payload = json.dumps(event).encode("utf-8")

    try:
        producer = KafkaProducer(bootstrap_servers=settings.kafka_bootstrap_servers)
        producer.send(settings.kafka_topic, payload)
        producer.flush(3)
        producer.close()
    except Exception:
        pass

    try:
        connection = pika.BlockingConnection(pika.URLParameters(settings.rabbitmq_url))
        channel = connection.channel()
        channel.queue_declare(queue=settings.rabbitmq_queue, durable=True)
        channel.basic_publish(exchange="", routing_key=settings.rabbitmq_queue, body=payload)
        connection.close()
    except Exception:
        pass
