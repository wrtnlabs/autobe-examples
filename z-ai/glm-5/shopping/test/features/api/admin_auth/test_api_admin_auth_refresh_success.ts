import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test successful admin token refresh flow.
 *
 * This test validates that:
 * 1. Admin can create an account and receive initial tokens
 * 2. Admin can refresh tokens using the refresh token
 * 3. New tokens are different from initial tokens
 * 4. Response contains valid admin profile with correct grade
 * 5. Token metadata (expired_at, refreshable_until) is properly set
 */
export async function test_api_admin_auth_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection for join
  const joinConnection: api.IConnection = { host: connection.host };
  // 2. Create admin account and get initial tokens
  const initialAuth = await authorize_admin_join(joinConnection, {});
  typia.assert(initialAuth);
  // Store initial tokens and profile for comparison
  const initialAccessToken = initialAuth.access;
  const initialRefreshToken = initialAuth.refresh;
  const adminId = initialAuth.id;
  const adminEmail = initialAuth.email;
  const adminName = initialAuth.name;
  // 3. Create new connection for refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // 4. Refresh tokens using the initial refresh token
  const refreshedAuth = await authorize_admin_refresh(refreshConnection, {
    body: {
      refresh_token: initialRefreshToken,
    } satisfies IShoppingMallAdmin.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 5. Validate new tokens are different from initial tokens
  TestValidator.notEquals(
    "access token should be different",
    refreshedAuth.access,
    initialAccessToken,
  );
  TestValidator.notEquals(
    "refresh token should be different",
    refreshedAuth.refresh,
    initialRefreshToken,
  );
  // 6. Validate admin profile matches the created account
  TestValidator.equals("admin id should match", refreshedAuth.id, adminId);
  TestValidator.equals(
    "admin email should match",
    refreshedAuth.email,
    adminEmail,
  );
  TestValidator.equals(
    "admin name should match",
    refreshedAuth.name,
    adminName,
  );
  TestValidator.equals(
    "admin grade should be regular",
    refreshedAuth.grade,
    "regular",
  );
  // 7. Validate token metadata is properly set
  TestValidator.predicate(
    "expired_at should be in the future",
    () => new Date(refreshedAuth.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until should be in the future",
    () => new Date(refreshedAuth.token.refreshable_until) > new Date(),
  );
}
