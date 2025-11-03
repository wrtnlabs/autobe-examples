import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppLogoutResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppLogoutResponse";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test idempotent logout operation on already-expired sessions.
 *
 * This test validates that the logout endpoint handles repeated logout attempts
 * gracefully when the session is already expired or terminated. The test
 * demonstrates proper idempotency and error handling for logout operations on
 * previously invalidated authentication sessions.
 *
 * Workflow:
 *
 * 1. Create a new user account with email and password
 * 2. Verify automatic authentication and token issuance upon registration
 * 3. Perform initial logout to terminate the session
 * 4. Attempt logout again with the already-expired session
 * 5. Validate error handling for repeated logout attempts
 * 6. Confirm the system properly manages session state transitions
 */
export async function test_api_user_logout_idempotent_already_expired(
  connection: api.IConnection,
) {
  // Step 1: Create new user account via registration
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphabets(12);

  const joinResponse: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoAppUser.IJoin,
    });
  typia.assert(joinResponse);

  // Validate user is authenticated after registration
  TestValidator.predicate(
    "user should be authenticated after registration",
    joinResponse.token !== undefined && joinResponse.token.access !== undefined,
  );

  TestValidator.equals(
    "registered user email should match input",
    joinResponse.email,
    userEmail,
  );

  TestValidator.equals(
    "user status should be active",
    joinResponse.status,
    "active",
  );

  // Step 2: Perform initial logout
  const firstLogoutResponse: ITodoAppLogoutResponse =
    await api.functional.todoApp.user.auth.logout(connection);
  typia.assert(firstLogoutResponse);

  TestValidator.predicate(
    "first logout should be successful",
    firstLogoutResponse.success === true,
  );

  TestValidator.predicate(
    "first logout should return confirmation message",
    firstLogoutResponse.message !== undefined &&
      firstLogoutResponse.message.length > 0,
  );

  // Step 3: Attempt logout again with already-expired session
  // This tests idempotency - the system should reject the second logout with an error
  // since the session/token is now invalid
  await TestValidator.error(
    "second logout with expired session should fail",
    async () => {
      return await api.functional.todoApp.user.auth.logout(connection);
    },
  );
}
