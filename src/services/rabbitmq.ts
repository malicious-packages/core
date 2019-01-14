import amqplib from 'amqplib';
import { commonConfig } from 'config';

interface CheckPackageMessage {
    packageName: string;
    packageVersion: string;
    installationString?: string;
}

type ConsumeFunction = (message: CheckPackageMessage) => Promise<unknown>;
type ProducerFunction = (message: CheckPackageMessage) => void;

export async function buildMessageConsumer(connectionString: string): Promise<(consume: ConsumeFunction) => unknown> {
    const channel = await setupChannel(connectionString);
    await channel.prefetch(1);

    return (consume: ConsumeFunction) => {
        channel.consume(commonConfig.rabbitMqQueueName, async (message) => {
            if (!message) {
                throw new Error('Consumer is cancelled');
            }

            const timeStart = Date.now();
            const messageContent = message.content.toString();
            try {
                await consume(JSON.parse(messageContent));
                channel.ack(message);
            } catch (e) {
                // tslint:disable-next-line:no-console
                console.error(`Failed to parse / process message "${messageContent}": ${e.message}`);
                channel.reject(message, false);
            }
            const timeEnd = Date.now();
            // tslint:disable-next-line:no-console
            console.info(
                `Message "${messageContent}" was processed in ${Math.round((timeEnd - timeStart) / 1000)} seconds`
            );
        });
    };
}

export async function buildMessageProducer(connectionString: string): Promise<ProducerFunction> {
    const channel = await setupChannel(connectionString);
    return (message: CheckPackageMessage) => {
        channel.sendToQueue(commonConfig.rabbitMqQueueName, Buffer.from(JSON.stringify(message)));
    };
}

async function setupChannel(connectionString: string) {
    const connection = await amqplib.connect(connectionString);
    const channel = await connection.createChannel();

    await channel.assertExchange(commonConfig.rabbitMqDeadLetterExchangeName, 'fanout', { durable: true });
    await channel.assertQueue(commonConfig.rabbitMqDeadLetterQueueName, { durable: true });
    await channel.bindQueue(commonConfig.rabbitMqDeadLetterQueueName, commonConfig.rabbitMqDeadLetterExchangeName, '');

    await channel.assertQueue(commonConfig.rabbitMqQueueName, {
        durable: true,
        maxPriority: commonConfig.rabbitMqMaxPriority,
        deadLetterExchange: commonConfig.rabbitMqDeadLetterExchangeName,
    });
    return channel;
}
