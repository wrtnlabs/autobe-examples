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
 * Test successful token refresh for super administrator.
 * 1. Register super administrator account and obtain initial tokens
 * 2. Extract refresh token from authentication response
 * 3. Call refresh endpoint with valid refresh token
 * 4. Verify new tokens are returned with updated expiration
 * 5. Validate token refresh business logic works correctly
 */
export async function test_api_super_admin_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register super administrator account and obtain initial tokens
  const superAdminConnection: api.IConnection = { host: connection.host };
  const initialAuth: IShoppingMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(superAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdmin.IJoin,
    });
  typia.assert(initialAuth);
  // Step 2: Extract refresh token from initial authentication response
  const refreshToken: string = initialAuth.token.refresh;
  TestValidator.predicate("refresh token exists", refreshToken.length > 0);
  // Step 3: Call refresh endpoint with valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth: IShoppingMallSuperAdmin.IAuthorized =
    await authorize_super_admin_refresh(refreshConnection, {
      body: {
        refresh_token: refreshToken,
      } satisfies IShoppingMallSuperAdmin.IRefresh,
    });
  typia.assert(refreshedAuth);
  // Step 4: Validate refresh operation succeeded
  TestValidator.equals("same super admin ID", refreshedAuth.id, initialAuth.id);
  TestValidator.equals("same email", refreshedAuth.email, initialAuth.email);
  // Step 5: Validate new tokens are different from initial tokens
  TestValidator.notEquals(
    "new access token",
    refreshedAuth.token.access,
    initialAuth.token.access,
  );
  TestValidator.notEquals(
    "new refresh token",
    refreshedAuth.token.refresh,
    initialAuth.token.refresh,
  );
  // Step 6: Validate token structure and expiration metadata
  TestValidator.predicate(
    "new access token exists",
    refreshedAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token exists",
    refreshedAuth.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expiration timestamp exists",
    refreshedAuth.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable until exists",
    refreshedAuth.token.refreshable_until.length > 0,
  );
  // Step 7: Validate expiration timestamps are valid date-time format
  const expiredAtDate = new Date(refreshedAuth.token.expired_at);
  TestValidator.predicate(
    "expired_at is valid date",
    expiredAtDate.getTime() > 0,
  );
  const refreshableUntilDate = new Date(refreshedAuth.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is valid date",
    refreshableUntilDate.getTime() > 0,
  );
  // Step 8: Validate refreshable_until is after or equal to expired_at
  TestValidator.predicate(
    "refreshable_until >= expired_at",
    refreshableUntilDate.getTime() >= expiredAtDate.getTime(),
  );
}
