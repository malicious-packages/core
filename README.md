## Cheatsheet

```bash
npm run start:dev # starts monitoring new packages and checking it locally
npm run test # unit tests
npm run lint # linters
npm run test:integration # integration tests for `test_package` localed in `test/test_package`. Results are stored in `tests/integration/baseline.json`
TEST_PACKAGE=react@16 npm run test:integration # runs integration tests for a specific package
```

## Architecture
- `src/producer.ts` periodically queries new packages and sends them to RabbitMQ
- `src/consumer.ts` is processing these messages by running a docker container that runs `src/checker.ts`

## MongoDB
MongoDB is used to store reports for processed packages. Each report has one of the following statuses:
- `unverified` - package has suspicious activity and needs to be checked manually
- `auto_verified` - package has no suspicious activity
- `verified` / `unsound` / `malicious` could be assigned to a report after a manual check

Use the following connection string to connect to local MongoDB instance: mongodb://root:123456@mongodb. Dump with more than 180000 reports (every package updated since June 1 2018) is available in `mongodb_dump`.

## RabbitMQ
RabbitMQ is used to store packages which need to be checked.

Use the following connection string to connect to local RabbitMQ instance: amqp://guest:123456@rabbitmq. RabbitMQ management UI is available at http://localhost:15672, credentials are guest / 123456.
