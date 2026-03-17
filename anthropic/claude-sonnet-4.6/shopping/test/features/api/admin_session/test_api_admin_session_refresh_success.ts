import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_session_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin account and get initial tokens
  const adminConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_admin_join(adminConnection, {});
  typia.assert(joinResult);
  // Capture original tokens for comparison
  const originalAccessToken = joinResult.token.access;
  const originalRefreshToken = joinResult.token.refresh;
  // Capture original admin profile for comparison
  const originalAdmin = joinResult.admin;
  // Step 2: Use the refresh token to obtain new tokens
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_admin_refresh(refreshConnection, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies IShoppingMallAdmin.IRefresh,
  });
  typia.assert(refreshResult);
  // Step 3: Validate new tokens are different from original (rotation)
  TestValidator.notEquals(
    "access token must be rotated",
    refreshResult.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "refresh token must be rotated",
    refreshResult.token.refresh,
    originalRefreshToken,
  );
  // Step 4: Validate token expiration timestamps are in the future
  const now = new Date().toISOString();
  TestValidator.predicate(
    "expired_at must be in the future",
    refreshResult.token.expired_at > now,
  );
  TestValidator.predicate(
    "refreshable_until must be in the future",
    refreshResult.token.refreshable_until > now,
  );
  TestValidator.predicate(
    "refreshable_until must be >= expired_at",
    refreshResult.token.refreshable_until >= refreshResult.token.expired_at,
  );
  // Step 5: Validate admin profile matches the original
  TestValidator.equals(
    "admin id matches",
    refreshResult.admin.id,
    originalAdmin.id,
  );
  TestValidator.equals(
    "admin email matches",
    refreshResult.admin.email,
    originalAdmin.email,
  );
  TestValidator.equals(
    "admin actor_type matches",
    refreshResult.admin.actor_type,
    originalAdmin.actor_type,
  );
  TestValidator.equals(
    "admin grade matches",
    refreshResult.admin.grade,
    originalAdmin.grade,
  );
  // Step 6: Validate admin account is still active
  TestValidator.equals(
    "admin deleted_at must be null",
    refreshResult.admin.deleted_at,
    null,
  );
}
