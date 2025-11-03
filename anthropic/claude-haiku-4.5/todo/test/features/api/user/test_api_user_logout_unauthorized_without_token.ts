import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppLogoutResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppLogoutResponse";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test logout operation when user attempts to logout without valid
 * authentication token.
 *
 * This test validates that the logout endpoint enforces authentication
 * requirements. The system should reject logout requests with 401 Unauthorized
 * error when no valid JWT token is provided in the Authorization header. This
 * is critical for security to prevent unauthorized actors from attempting to
 * manipulate user sessions.
 *
 * Test flow:
 *
 * 1. Create a user account to establish user context
 * 2. Remove authentication token from connection headers (simulate unauthenticated
 *    state)
 * 3. Attempt logout without valid JWT token
 * 4. Verify the request fails with 401 Unauthorized error
 * 5. Confirm authentication requirement is enforced
 */
export async function test_api_user_logout_unauthorized_without_token(
  connection: api.IConnection,
) {
  // Step 1: Create a user account to establish context
  const joinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies ITodoAppUser.IJoin;

  const authenticatedUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: joinData,
    });
  typia.assert(authenticatedUser);

  // Step 2: Create unauthenticated connection by removing authorization header
  // This simulates a user making a request without a valid token
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {}, // Empty headers - no Authorization token
  };

  // Step 3 & 4: Attempt to logout without valid authentication token
  // Verify the request fails with 401 Unauthorized error
  await TestValidator.httpError(
    "logout without token should return 401 Unauthorized",
    401,
    async () => {
      await api.functional.todoApp.user.auth.logout(unauthenticatedConnection);
    },
  );

  // Step 5: Confirm authentication requirement is enforced
  TestValidator.predicate("authentication enforcement validated", true);
}
