import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test the admin user's ability to successfully refresh JWT access tokens using
 * a valid refresh token.
 *
 * This test verifies the entire token lifecycle, starting from admin
 * registration, login to obtain tokens, refreshing tokens with a valid refresh
 * token, and validating the token data.
 *
 * Steps:
 *
 * 1. Register a new admin user to create a fresh admin context.
 * 2. Login as this user to obtain access and refresh tokens.
 * 3. Refresh the token using the valid refresh token.
 * 4. Verify the refreshed token details.
 */
export async function test_api_admin_token_refresh_with_valid_refresh_token(
  connection: api.IConnection,
) {
  // Step 1. Register a new admin user with a fresh email
  const email = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email: email,
    password: "P@ssw0rd!",
    full_name: "Test Admin User",
  } satisfies IShoppingMallAdmin.IJoin;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(admin);

  // Step 2. Login as the new admin user to get tokens
  const loginBody = {
    email: email,
    password: "P@ssw0rd!",
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdmin.ILogin;

  const loginResult: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: loginBody });
  typia.assert(loginResult);

  // Validate presence of access and refresh tokens
  TestValidator.predicate(
    "access token should be a non-empty string",
    loginResult.token.access !== "",
  );
  TestValidator.predicate(
    "refresh token should be a non-empty string",
    loginResult.token.refresh !== "",
  );

  // Step 3. Refresh tokens using the valid refresh token
  const refreshBody = {
    refresh_token: loginResult.token.refresh,
  } satisfies IShoppingMallAdmin.IRefresh;

  const refreshResult: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, { body: refreshBody });
  typia.assert(refreshResult);

  // Step 4. Verify the refreshed tokens belong to the same admin user
  TestValidator.equals(
    "refreshed admin id matches logged in admin id",
    refreshResult.id,
    loginResult.id,
  );
  TestValidator.equals(
    "refreshed admin email matches logged in admin email",
    refreshResult.email,
    loginResult.email,
  );

  // Step 5. Verify the refreshed tokens are different from old tokens
  TestValidator.predicate(
    "refreshed access token is different from old",
    refreshResult.token.access !== loginResult.token.access,
  );
  TestValidator.predicate(
    "refreshed refresh token is different from old",
    refreshResult.token.refresh !== loginResult.token.refresh,
  );

  // Step 6. Verify the refreshed tokens are non-empty strings
  TestValidator.predicate(
    "refreshed access token should be a non-empty string",
    typeof refreshResult.token.access === "string" &&
      refreshResult.token.access !== "",
  );
  TestValidator.predicate(
    "refreshed refresh token should be a non-empty string",
    typeof refreshResult.token.refresh === "string" &&
      refreshResult.token.refresh !== "",
  );
}
