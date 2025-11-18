import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListLogoutResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListLogoutResponse";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test logout behavior when user attempts to logout using an
 * already-invalidated token.
 *
 * This test validates the security mechanism that prevents reuse of invalidated
 * tokens. The test flow includes:
 *
 * 1. User registers and receives initial authentication token
 * 2. User logs out successfully, invalidating the token
 * 3. User attempts to logout again using the same invalidated token
 * 4. Endpoint rejects the request due to invalid/blacklisted token
 * 5. Verify that already-invalidated tokens cannot be used for further operations
 *
 * This ensures proper token blacklist enforcement and prevents unauthorized
 * access attempts using previously revoked tokens.
 */
export async function test_api_user_logout_already_logged_out(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account with initial authentication
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "securePassword123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Verify user was created with proper authentication token
  TestValidator.predicate(
    "user account created with access token",
    user.token.access !== undefined && user.token.access.length > 0,
  );

  // Step 2: First logout - should succeed
  const firstLogout: ITodoListLogoutResponse =
    await api.functional.todoList.user.auth.user.logout(connection);
  typia.assert(firstLogout);

  // Verify first logout was successful
  TestValidator.equals(
    "first logout success status",
    firstLogout.success,
    true,
  );
  TestValidator.equals(
    "first logout affected one session",
    firstLogout.sessions_affected,
    1,
  );

  // Step 3: Attempt second logout using the same (now invalidated) token
  // The connection still has the invalidated token in headers
  await TestValidator.error(
    "second logout with invalidated token should fail",
    async () => {
      await api.functional.todoList.user.auth.user.logout(connection);
    },
  );
}
