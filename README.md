## Cheatsheet

```bash
npm run start:dev # starts monitoring new packages and checking it locally
npm run test # unit tests
npm run lint # linters
npm run test:integration # integration tests for `test_package` localed in `test/test_package`. Results are stored in `tests/integration/baseline.json`
TEST_PACKAGE=react@16 npm run test:integration # runs integration tests for a specific package
```
