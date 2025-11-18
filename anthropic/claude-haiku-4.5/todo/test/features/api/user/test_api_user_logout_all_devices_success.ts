import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListLogoutResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListLogoutResponse";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test successful global logout across all devices.
 *
 * This test validates the core security workflow where users can disconnect
 * from all devices simultaneously. The operation terminates all active sessions
 * and invalidates all JWT tokens across all devices.
 *
 * Test flow:
 *
 * 1. Register new user account to establish authenticated session
 * 2. Verify user authentication and token validity
 * 3. Initiate global logout operation
 * 4. Verify logout response confirms successful operation
 * 5. Validate session count and logout timestamp in response
 * 6. Confirm all sessions are terminated and tokens invalidated
 */
export async function test_api_user_logout_all_devices_success(
  connection: api.IConnection,
) {
  // Step 1: Register new user account
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(10);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const user_agent = RandomGenerator.alphaNumeric(20);
  const ip = "192.168.1.1";

  const registrationResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password: password + "aA1!",
        href,
        referrer,
        user_agent,
        ip,
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(registrationResponse);

  // Step 2: Verify user authentication
  TestValidator.equals("user email matches", registrationResponse.email, email);
  TestValidator.predicate(
    "user is registered with valid ID",
    registrationResponse.id !== null && registrationResponse.id !== undefined,
  );
  TestValidator.predicate(
    "user account is active",
    registrationResponse.deleted_at === null,
  );

  // Step 3: Verify access token validity
  const tokenResponse = registrationResponse.token;
  typia.assert(tokenResponse);
  TestValidator.predicate(
    "access token is present",
    tokenResponse.access !== null && tokenResponse.access !== undefined,
  );
  TestValidator.predicate(
    "refresh token is present",
    tokenResponse.refresh !== null && tokenResponse.refresh !== undefined,
  );
  TestValidator.predicate(
    "token has expiration timestamp",
    tokenResponse.expired_at !== null && tokenResponse.expired_at !== undefined,
  );

  // Step 4: Initiate global logout operation
  const logoutResponse: ITodoListLogoutResponse =
    await api.functional.todoList.user.auth.user.logout_all_devices.logoutAllDevices(
      connection,
    );
  typia.assert(logoutResponse);

  // Step 5: Verify logout response confirms successful operation
  TestValidator.equals(
    "logout success flag is true",
    logoutResponse.success,
    true,
  );
  TestValidator.predicate(
    "logout message is present",
    logoutResponse.message !== null && logoutResponse.message !== undefined,
  );

  // Step 6: Validate session count in response
  TestValidator.predicate(
    "at least one session was affected",
    logoutResponse.sessions_affected >= 1,
  );
  TestValidator.predicate(
    "sessions_affected is a valid number",
    typeof logoutResponse.sessions_affected === "number",
  );

  // Step 7: Validate logout timestamp is set
  TestValidator.predicate(
    "logout_completed_at is present",
    logoutResponse.logout_completed_at !== null &&
      logoutResponse.logout_completed_at !== undefined,
  );
}
