import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_token_refresh_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new admin account to have a valid credential
  const adminCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    role: "full_admin" as const,
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateData,
    });
  typia.assert(admin);

  // Step 2: Login to obtain a fresh token pair (including refresh token)
  const loginBody = {
    email: admin.email,
    password_hash: adminCreateData.password,
  } satisfies IShoppingMallAdmin.IRequest;

  const loginResponse: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginBody,
    });
  typia.assert(loginResponse);

  // Step 3: Extract refresh token from login response
  const refreshToken = loginResponse.token.refresh;
  const accessToken = loginResponse.token.access;

  // Step 4: Use refresh token to get new tokens
  const refreshBody = {
    refresh_token_hash: refreshToken,
  } satisfies IShoppingMallAdmin.IRefresh;

  const refreshResponse: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshResponse);

  // Step 5: Validate the refresh response contains the expected admin profile
  TestValidator.equals(
    "admin ID matches",
    refreshResponse.id,
    loginResponse.id,
  );
  TestValidator.equals(
    "admin email matches",
    refreshResponse.email,
    loginResponse.email,
  );
  TestValidator.equals(
    "admin first_name matches",
    refreshResponse.first_name,
    loginResponse.first_name,
  );
  TestValidator.equals(
    "admin last_name matches",
    refreshResponse.last_name,
    loginResponse.last_name,
  );
  TestValidator.equals(
    "admin role matches",
    refreshResponse.role,
    loginResponse.role,
  );
  TestValidator.equals(
    "admin status is active",
    refreshResponse.status,
    "active",
  );

  // Validate token information is present and of correct type
  TestValidator.predicate(
    "token exists",
    () => refreshResponse.token !== undefined,
  );
  TestValidator.equals(
    "new access token is string",
    typeof refreshResponse.token.access,
    "string",
  );
  TestValidator.equals(
    "new refresh token is string",
    typeof refreshResponse.token.refresh,
    "string",
  );
  TestValidator.predicate("access token expired_at is valid date-time", () =>
    typia.is<string & tags.Format<"date-time">>(
      refreshResponse.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refresh token refreshable_until is valid date-time",
    () =>
      typia.is<string & tags.Format<"date-time">>(
        refreshResponse.token.refreshable_until,
      ),
  );

  // Validate that refresh token rotation occurred (new tokens are different)
  TestValidator.notEquals(
    "new access token is different from old",
    refreshResponse.token.access,
    accessToken,
  );
  TestValidator.notEquals(
    "new refresh token is different from old",
    refreshResponse.token.refresh,
    refreshToken,
  );

  // Step 6: Verify original refresh token is invalidated by creating a clean connection
  // Create new connection with empty headers to ensure no residual authorization
  const cleanConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "original refresh token should be invalid",
    async () => {
      await api.functional.auth.admin.refresh(cleanConnection, {
        body: refreshBody, // Uses old refresh token hash
      });
    },
  );
}
