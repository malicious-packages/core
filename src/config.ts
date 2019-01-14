import * as path from 'path';

export const commonConfig = {
    rabbitMqQueueName: 'packages-to-check',
    rabbitMqDeadLetterExchangeName: 'failed-packages',
    rabbitMqDeadLetterQueueName: 'failed-packages',
    rabbitMqMaxPriority: 100,
    mongoDbName: 'malicious-packages',
    mongoCollectionName: 'packages',
};

export const consumerConfig = {
    basePath: path.resolve('/opt', 'consumer'),
    dockerPath: path.resolve('/opt', 'consumer', 'docker'),
    logsPath: path.resolve('/opt', 'consumer', 'logs'),
    hostLogsPath: path.resolve('/opt', 'consumer', 'host_logs'),
    mitmdumpLogsPath: path.resolve('/opt', 'consumer', 'mitmdump_logs'),
};

export const checkerConfig = {
    basePath: path.resolve('/opt', 'checker'),
    nodeModulesPath: path.resolve('/opt', 'checker', 'node_modules'),
    logsPath: path.resolve('/opt', 'checker', 'logs'),
    mitmdumpLogsPath: path.resolve('/opt', 'checker', 'mitmdump_logs'),
};
