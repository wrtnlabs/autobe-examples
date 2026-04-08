import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator refresh token functionality with token rotation validation.
 *
 * Validates the administrator authentication token refresh mechanism. Tests that refresh tokens obtained during administrator registration can be used to obtain new access and refresh tokens without re-authentication. Verifies that token rotation occurs correctly, generating new tokens on each refresh.
 *
 * Note: The original scenario plan included testing banned administrator refresh token rejection, but the ban endpoint (/administrator/administrators/{id}/ban) is not available in the provided SDK. This test focuses on validating the core refresh token functionality and token rotation instead.
 *
 * 1. Register a super administrator account via /shoppingMall/auth/administrator/join with valid credentials.
 * 2. Register a regular administrator account via /shoppingMall/auth/administrator/join with different credentials.
 * 3. Capture the refresh_token from the regular administrator's IAuthorized response.
 * 4. Call /shoppingMall/auth/administrator/refresh with the captured refresh_token.
 * 5. Verify the refresh operation returns a new IAuthorized response with updated tokens.
 * 6. Validate that new access and refresh tokens are provided (token rotation).
 * 7. Confirm that token expiration timestamps are correctly set and valid.
 */
export async function test_api_administrator_refresh_token_banned_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_administrator_join(superAdminConnection, {
    body: {
      email: "superadmin@test.com",
      password: "SecurePass123",
    },
  });
  typia.assert(superAdmin);
  // 2. Create regular administrator account
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_administrator_join(
    regularAdminConnection,
    {
      body: {
        email: "admin@test.com",
        password: "SecurePass456",
      },
    },
  );
  typia.assert(regularAdmin);
  // 3. Capture refresh token from regular administrator
  const refreshToken: string = regularAdmin.token.refresh;
  // 4. Attempt to refresh tokens using captured refresh token
  const refreshedAdmin = await authorize_administrator_refresh(
    regularAdminConnection,
    {
      body: {
        refresh_token: refreshToken,
      } satisfies IShoppingMallAdministrator.IRefresh,
    },
  );
  typia.assert(refreshedAdmin);
  // 5. Validate refresh response preserves administrator identity
  TestValidator.equals(
    "administrator ID preserved after refresh",
    refreshedAdmin.id,
    regularAdmin.id,
  );
  TestValidator.equals(
    "email preserved after refresh",
    refreshedAdmin.email,
    regularAdmin.email,
  );
  // 6. Validate token rotation (new tokens generated)
  TestValidator.predicate(
    "new access token provided",
    refreshedAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token provided",
    refreshedAdmin.token.refresh.length > 0,
  );
  TestValidator.notEquals(
    "access token is different after refresh",
    refreshedAdmin.token.access,
    regularAdmin.token.access,
  );
  TestValidator.notEquals(
    "refresh token is different after refresh",
    refreshedAdmin.token.refresh,
    regularAdmin.token.refresh,
  );
  // 7. Validate token expiration timestamps
  TestValidator.predicate(
    "expired_at is valid datetime",
    !isNaN(Date.parse(refreshedAdmin.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is valid datetime",
    !isNaN(Date.parse(refreshedAdmin.token.refreshable_until)),
  );
  TestValidator.predicate(
    "access token expires before refresh token",
    new Date(refreshedAdmin.token.expired_at) <
      new Date(refreshedAdmin.token.refreshable_until),
  );
}
