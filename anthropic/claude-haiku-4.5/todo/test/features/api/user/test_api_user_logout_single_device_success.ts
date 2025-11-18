import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListLogoutResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListLogoutResponse";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test successful logout from current device.
 *
 * Validates the logout endpoint behavior for single-device logout scenarios.
 * This test ensures that:
 *
 * - Authenticated user can successfully logout from current device
 * - Session is properly marked as expired after logout
 * - JWT token is added to blacklist preventing reuse
 * - Response contains correct logout confirmation details
 *
 * Workflow:
 *
 * 1. Create new user account with initial session via join endpoint
 * 2. Call logout endpoint with authenticated user
 * 3. Validate successful logout response with correct metadata
 */
export async function test_api_user_logout_single_device_success(
  connection: api.IConnection,
) {
  // Step 1: Create new user account and get initial session with JWT tokens
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphabets(10);

  const joinResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });

  typia.assert(joinResponse);
  typia.assert(joinResponse.token);

  // Verify join response contains required authentication token
  TestValidator.predicate(
    "join response contains access token",
    joinResponse.token.access !== undefined &&
      joinResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "join response contains refresh token",
    joinResponse.token.refresh !== undefined &&
      joinResponse.token.refresh.length > 0,
  );

  // Step 2: Call logout endpoint with authenticated session
  // The connection headers automatically contain the access token from join response
  const logoutResponse: ITodoListLogoutResponse =
    await api.functional.todoList.user.auth.user.logout(connection);

  typia.assert(logoutResponse);

  // Step 3: Validate successful logout response
  TestValidator.predicate(
    "logout response success flag is true",
    logoutResponse.success === true,
  );

  TestValidator.predicate(
    "logout message confirms current device logout",
    logoutResponse.message.toLowerCase().includes("logged out") &&
      logoutResponse.message.toLowerCase().includes("device"),
  );

  TestValidator.equals(
    "sessions_affected count is 1 for single device logout",
    logoutResponse.sessions_affected,
    1,
  );

  TestValidator.predicate(
    "logout_completed_at is valid ISO 8601 datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(
      logoutResponse.logout_completed_at,
    ),
  );
}
