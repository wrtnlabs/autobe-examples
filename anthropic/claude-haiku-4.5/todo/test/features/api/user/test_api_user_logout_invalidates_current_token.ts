import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListLogoutResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListLogoutResponse";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates that logout invalidates the current token used for the logout
 * request.
 *
 * This test verifies the logout behavior where a user's current session is
 * terminated and their authentication token is invalidated.
 *
 * Test flow:
 *
 * 1. Create a user account and obtain an authentication token
 * 2. Verify the token is valid by attempting to logout
 * 3. Call logout endpoint with the current token
 * 4. Verify logout response indicates success and 1 session affected
 * 5. Verify that the token is now invalid after logout
 * 6. Confirm logout completion timestamp is recorded
 */
export async function test_api_user_logout_invalidates_current_token(
  connection: api.IConnection,
) {
  // Step 1: Create user account and obtain authentication token
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "SecurePassword123456!";

  const joinResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: "192.168.1.100",
        user_agent: "Mozilla/5.0 Device1",
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(joinResponse);
  const authToken = joinResponse.token.access;

  // Step 2: Create authenticated connection with the obtained token
  const authenticatedConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${authToken}`,
    },
  };

  // Step 3: Call logout endpoint with current token
  const logoutResponse: ITodoListLogoutResponse =
    await api.functional.todoList.user.auth.user.logout(
      authenticatedConnection,
    );
  typia.assert(logoutResponse);

  // Step 4: Verify logout response indicates successful logout
  TestValidator.predicate(
    "logout success flag is true",
    logoutResponse.success === true,
  );
  TestValidator.equals(
    "sessions affected should be 1",
    logoutResponse.sessions_affected,
    1,
  );
  TestValidator.predicate(
    "logout message is not empty",
    logoutResponse.message.length > 0,
  );
  TestValidator.predicate(
    "logout message indicates current device",
    logoutResponse.message.includes("device") ||
      logoutResponse.message.includes("logged out"),
  );

  // Step 5: Verify logout completion timestamp is valid ISO 8601 format
  TestValidator.predicate(
    "logout completed at is valid ISO 8601 datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      logoutResponse.logout_completed_at,
    ),
  );

  // Step 6: Verify the token is now invalid after logout
  await TestValidator.error(
    "invalidated token should not work for subsequent logout request",
    async () => {
      await api.functional.todoList.user.auth.user.logout(
        authenticatedConnection,
      );
    },
  );
}
