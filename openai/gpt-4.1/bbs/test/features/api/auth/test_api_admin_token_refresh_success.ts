import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Validate correct token refresh for an admin session by registering, logging
 * in to obtain a refresh token, and then using the refresh token to retrieve
 * new tokens. Confirm new tokens are issued only for a currently active,
 * unlocked, and non-deleted admin session. This ensures the refresh workflow
 * follows business authentication standards.
 *
 * Steps:
 *
 * 1. Register a new admin account
 * 2. Login as the admin to obtain initial access and refresh tokens
 * 3. Perform token refresh using the obtained refresh token
 * 4. Confirm that newly issued tokens are provided, and returned admin profile
 *    matches the expected state
 */
export async function test_api_admin_token_refresh_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin account
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    avatar_url: undefined,
  } satisfies IDiscussionBoardAdmin.ICreate;
  const registered = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(registered);

  // 2. Login as the admin to obtain initial tokens
  const loginInput = {
    email: adminInput.email,
    password: adminInput.password,
    href: "https://admin-panel.example.com/login",
    referrer: "https://admin-panel.example.com/",
    ip: undefined,
  } satisfies IDiscussionBoardAdmin.ILogin;
  const loggedIn = await api.functional.auth.admin.login(connection, {
    body: loginInput,
  });
  typia.assert(loggedIn);

  TestValidator.predicate(
    "login response includes refresh token",
    typeof loggedIn.token.refresh === "string" &&
      loggedIn.token.refresh.length > 0,
  );

  // 3. Use the refresh token for a new token
  const refreshInput = {
    refresh_token: loggedIn.token.refresh,
  } satisfies IDiscussionBoardAdmin.IRefresh;

  const refreshed = await api.functional.auth.admin.refresh(connection, {
    body: refreshInput,
  });
  typia.assert(refreshed);

  // 4. Validate new tokens
  TestValidator.notEquals(
    "refreshed access token differs from previous login",
    refreshed.token.access,
    loggedIn.token.access,
  );
  TestValidator.notEquals(
    "refreshed refresh token differs from previous login",
    refreshed.token.refresh,
    loggedIn.token.refresh,
  );
  TestValidator.equals(
    "admin profile remains same after refresh",
    refreshed.email,
    loggedIn.email,
  );
  TestValidator.equals(
    "admin is still unlocked after refresh",
    refreshed.is_locked,
    false,
  );
  TestValidator.equals(
    "admin is not deleted after refresh",
    refreshed.deleted_at,
    null,
  );
}
