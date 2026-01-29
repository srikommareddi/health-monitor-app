import json
import time

import pika

from .core.config import settings


def main() -> None:
    params = pika.URLParameters(settings.rabbitmq_url)
    while True:
        connection = None
        try:
            connection = pika.BlockingConnection(params)
            channel = connection.channel()
            channel.queue_declare(queue=settings.rabbitmq_queue, durable=True)

            for method_frame, _, body in channel.consume(settings.rabbitmq_queue, inactivity_timeout=1):
                if body is None:
                    continue
                event = json.loads(body.decode("utf-8"))
                print(f"[worker] event received: {event}")
                if method_frame:
                    channel.basic_ack(delivery_tag=method_frame.delivery_tag)
        except Exception:
            time.sleep(2)
        finally:
            if connection:
                try:
                    connection.close()
                except Exception:
                    pass


if __name__ == "__main__":
    main()
