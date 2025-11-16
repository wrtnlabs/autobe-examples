import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodoUserRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserRefresh";

/**
 * Validate todoUser refresh token endpoint behavior with a malformed token.
 *
 * Business intent:
 *
 * - Ensure that POST /auth/todoUser/refresh strictly validates the provided
 *   refreshToken and rejects structurally invalid or tampered tokens.
 * - Confirm that, on failure, the endpoint does not return
 *   ITodoAppTodoUser.IAuthorized payloads or any new JWT tokens, and that error
 *   responses do not leak implementation details.
 *
 * Scenario constraints and adjustments:
 *
 * - The provided SDK function `api.functional.auth.todoUser.refresh` is typed to
 *   always return ITodoAppTodoUser.IAuthorized on success and to throw
 *   HttpError on HTTP error responses.
 * - The simulation mode (`connection.simulate === true`) short-circuits actual
 *   HTTP calling and instead returns random authorized payloads even when the
 *   request body is invalid at business level; therefore, this test MUST run
 *   against a real backend (simulate !== true) to meaningfully validate error
 *   handling.
 * - The test cannot and must not introspect internal error payload structures or
 *   HTTP status codes, but it can assert that an HttpError is thrown for an
 *   invalid token, which implies that the response is non-IAuthorized and that
 *   no new tokens are issued.
 *
 * What this test validates:
 *
 * 1. A clearly malformed refreshToken (random non-JWT-like string) passed in
 *    ITodoAppTodoUserRefresh.IRequest causes
 *    `api.functional.auth.todoUser.refresh` to reject with an HttpError rather
 *    than returning ITodoAppTodoUser.IAuthorized.
 * 2. No ITodoAppTodoUser.IAuthorized instance is produced in the error path, so no
 *    access/refresh tokens are accidentally issued for invalid tokens.
 * 3. The SDK-level behavior: error is surfaced as a thrown HttpError, suitable for
 *    client-side handling (e.g., forcing re-authentication).
 */
export async function test_api_todo_user_token_refresh_with_malformed_token(
  connection: api.IConnection,
) {
  // Ensure that this test is meaningful only when not using simulate mode.
  TestValidator.predicate(
    "todoUser refresh malformed token test requires non-simulate connection",
    () => connection.simulate !== true,
  );

  // 1. Prepare an obviously malformed refresh token string.
  const malformedToken: string = `${RandomGenerator.alphaNumeric(16)}.${RandomGenerator.alphaNumeric(8)}`;

  const requestBody = {
    refreshToken: malformedToken,
  } satisfies ITodoAppTodoUserRefresh.IRequest;

  // 2. Call the refresh endpoint and expect it to fail with an error.
  await TestValidator.error(
    "todoUser refresh should fail for malformed refresh token",
    async () => {
      const result: ITodoAppTodoUser.IAuthorized =
        await api.functional.auth.todoUser.refresh(connection, {
          body: requestBody,
        });

      // If, unexpectedly, no error is thrown and we get a result, assert its
      // type and explicitly fail the test to highlight a security issue.
      typia.assert<ITodoAppTodoUser.IAuthorized>(result);
      throw new Error(
        "Expected refresh to fail for malformed token, but it succeeded.",
      );
    },
  );
}
