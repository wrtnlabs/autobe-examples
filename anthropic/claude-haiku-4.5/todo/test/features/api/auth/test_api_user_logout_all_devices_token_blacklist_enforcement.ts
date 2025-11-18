import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListLogoutResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListLogoutResponse";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validates token blacklist enforcement after global logout.
 *
 * This test ensures that the token revocation system works correctly by:
 *
 * 1. Creating a new user account and obtaining initial access token
 * 2. Storing the access token from the join response
 * 3. Performing a global logout which should invalidate all tokens
 * 4. Attempting to use the previously valid token to access a protected endpoint
 * 5. Verifying that the request fails with 401 Unauthorized
 *
 * This is critical for security as it confirms that logout actually prevents
 * token reuse and that the token blacklist mechanism is functioning properly.
 */
export async function test_api_user_logout_all_devices_token_blacklist_enforcement(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "SecurePassword123"; // minimum 8 characters as per ICreate.ICreate

  const joinResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(joinResponse);

  // Step 2: Store the access token
  const accessTokenBeforeLogout = joinResponse.token.access;
  TestValidator.predicate(
    "access token should be a non-empty string",
    typeof accessTokenBeforeLogout === "string" &&
      accessTokenBeforeLogout.length > 0,
  );

  // Step 3: Perform global logout which invalidates all tokens
  const logoutResponse: ITodoListLogoutResponse =
    await api.functional.todoList.user.auth.user.logout_all_devices.logoutAllDevices(
      connection,
    );
  typia.assert(logoutResponse);
  TestValidator.equals("logout should succeed", logoutResponse.success, true);
  TestValidator.predicate(
    "should have affected at least one session",
    logoutResponse.sessions_affected >= 1,
  );

  // Step 4: Create a new connection with the old access token to test blacklist enforcement
  const blacklistedTokenConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${accessTokenBeforeLogout}`,
    },
  };

  // Step 5: Attempt to use the blacklisted token to access a protected endpoint
  // The logout-all-devices endpoint requires authentication, so attempting to call it
  // with a blacklisted token should fail with 401 Unauthorized
  await TestValidator.error(
    "blacklisted token should be rejected with 401 Unauthorized",
    async () => {
      await api.functional.todoList.user.auth.user.logout_all_devices.logoutAllDevices(
        blacklistedTokenConnection,
      );
    },
  );
}
