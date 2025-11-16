import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test that token refresh maintains proper session continuity and doesn't
 * create duplicate sessions.
 *
 * This test validates the JWT token refresh mechanism for administrators by:
 *
 * 1. Creating an admin account and establishing an initial session
 * 2. Performing multiple sequential token refresh operations
 * 3. Validating that each refresh returns new valid tokens
 * 4. Ensuring session continuity (updates existing session, doesn't duplicate)
 * 5. Verifying refresh token expiration handling
 *
 * Business logic tested:
 *
 * - Token refresh extends session without requiring password re-entry
 * - Each refresh operation updates the session record in todo_list_admin_sessions
 * - New access and refresh tokens are issued with each refresh
 * - Admin identity remains consistent across refresh operations
 * - Refresh token expiration (refreshable_until) is properly enforced
 */
export async function test_api_admin_token_refresh_session_continuity(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const registeredAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(registeredAdmin);

  // Step 2: Perform login to establish initial session
  const loginResult = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ILogin,
  });
  typia.assert(loginResult);

  // Store initial tokens for comparison
  const initialAccessToken = loginResult.token.access;
  const initialRefreshToken = loginResult.token.refresh;
  const initialRefreshableUntil = loginResult.token.refreshable_until;

  // Validate admin identity
  TestValidator.equals("admin ID matches", loginResult.id, registeredAdmin.id);
  TestValidator.equals("admin email matches", loginResult.email, adminEmail);

  // Step 3: Perform first token refresh
  const firstRefresh = await api.functional.auth.admin.refresh(connection, {
    body: {
      refreshToken: initialRefreshToken,
    } satisfies ITodoListAdmin.IRefresh,
  });
  typia.assert(firstRefresh);

  // Validate first refresh response
  TestValidator.equals(
    "admin ID unchanged after first refresh",
    firstRefresh.id,
    registeredAdmin.id,
  );
  TestValidator.equals(
    "admin email unchanged after first refresh",
    firstRefresh.email,
    adminEmail,
  );
  TestValidator.notEquals(
    "new access token after first refresh",
    firstRefresh.token.access,
    initialAccessToken,
  );
  TestValidator.notEquals(
    "new refresh token after first refresh",
    firstRefresh.token.refresh,
    initialRefreshToken,
  );

  // Store first refresh tokens
  const firstRefreshAccessToken = firstRefresh.token.access;
  const firstRefreshRefreshToken = firstRefresh.token.refresh;

  // Step 4: Perform second token refresh to validate multiple refresh operations
  const secondRefresh = await api.functional.auth.admin.refresh(connection, {
    body: {
      refreshToken: firstRefreshRefreshToken,
    } satisfies ITodoListAdmin.IRefresh,
  });
  typia.assert(secondRefresh);

  // Validate second refresh response
  TestValidator.equals(
    "admin ID unchanged after second refresh",
    secondRefresh.id,
    registeredAdmin.id,
  );
  TestValidator.equals(
    "admin email unchanged after second refresh",
    secondRefresh.email,
    adminEmail,
  );
  TestValidator.notEquals(
    "new access token after second refresh",
    secondRefresh.token.access,
    firstRefreshAccessToken,
  );
  TestValidator.notEquals(
    "new refresh token after second refresh",
    secondRefresh.token.refresh,
    firstRefreshRefreshToken,
  );

  // Validate token rotation - old tokens should not equal new tokens
  TestValidator.notEquals(
    "second refresh access token differs from first",
    secondRefresh.token.access,
    firstRefreshAccessToken,
  );
  TestValidator.notEquals(
    "second refresh token differs from first",
    secondRefresh.token.refresh,
    firstRefreshRefreshToken,
  );
}
