import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super administrator refresh token expiration handling.
 *
 * Validates the edge case where a super administrator attempts to refresh authentication with an expired or invalid refresh token. The test creates a super administrator account, obtains initial tokens, and then attempts to refresh using an invalid token to verify the system properly rejects expired sessions.
 *
 * The system validates refresh tokens against the shopping_mall_super_admin_sessions table, checking that expired_at is in the future. When a refresh token is expired or invalid, the system must reject the request with 401 Unauthorized, enforcing the business rule that expired sessions cannot be renewed without re-authentication.
 *
 * 1. Create super administrator account using authorize_super_admin_join utility.
 * 2. Capture the initial refresh token from the authentication response.
 * 3. Attempt to refresh using an invalid/fake refresh token.
 * 4. Validate that the system rejects the request with appropriate error (401 Unauthorized).
 * 5. Verify that valid refresh token still works for the same session.
 */
export async function test_api_super_admin_refresh_token_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account and obtain initial tokens
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(authorized);
  // 2. Verify initial authentication response structure
  TestValidator.predicate(
    "has access token",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has expiration timestamp",
    authorized.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "has refreshable until timestamp",
    authorized.token.refreshable_until.length > 0,
  );
  // 3. Test refresh with invalid/fake refresh token (simulates expired token scenario)
  // Since we cannot manipulate server-side token expiration in E2E tests,
  // we test with an invalid token to verify the validation logic
  const invalidRefreshToken = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("rejects invalid refresh token", async () => {
    const invalidConnection: api.IConnection = { host: connection.host };
    await api.functional.shoppingMall.auth.super_admin.refresh(
      invalidConnection,
      {
        body: {
          refreshToken: invalidRefreshToken,
        } satisfies IShoppingMallSuperAdmin.IRefresh,
      },
    );
  });
  // 4. Test refresh with valid refresh token should succeed
  const validRefreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await api.functional.shoppingMall.auth.super_admin.refresh(
    validRefreshConnection,
    {
      body: {
        refreshToken: authorized.token.refresh,
      } satisfies IShoppingMallSuperAdmin.IRefresh,
    },
  );
  typia.assert(refreshed);
  // 5. Validate refreshed token response
  TestValidator.equals("same user id", refreshed.id, authorized.id);
  TestValidator.equals("same email", refreshed.email, authorized.email);
  TestValidator.predicate(
    "has new access token",
    refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "has new refresh token",
    refreshed.token.refresh.length > 0,
  );
  TestValidator.notEquals(
    "new access token differs",
    refreshed.token.access,
    authorized.token.access,
  );
  TestValidator.notEquals(
    "new refresh token differs",
    refreshed.token.refresh,
    authorized.token.refresh,
  );
}
