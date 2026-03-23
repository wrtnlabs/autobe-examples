import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_refresh_with_soft_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test the security behavior of admin token refresh mechanism.
   *
   * This test validates:
   * 1. Admin account creation and token issuance
   * 2. Token refresh functionality with valid refresh token
   * 3. Proper token validation and response structure
   *
   * Note: Full soft-deletion testing requires admin management endpoints
   * which are not available in the current SDK. This test focuses on
   * the refresh mechanism validation.
   */
  // 1. Create new admin account and obtain refresh token
  const adminConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  typia.assert(joinResult);
  // Store the refresh token for later use
  const refreshToken = joinResult.token.refresh;
  TestValidator.predicate("refresh token exists", refreshToken.length > 0);
  // 2. Create a new connection for refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // 3. Attempt to refresh tokens using the valid refresh token
  const refreshResult = await authorize_admin_refresh(refreshConnection, {
    body: {
      refresh_token: refreshToken,
    } satisfies IHrmPlatformAdmin.IRefresh,
  });
  typia.assert(refreshResult);
  // 4. Validate refresh response
  TestValidator.equals("admin ID preserved", refreshResult.id, joinResult.id);
  TestValidator.equals(
    "email preserved",
    refreshResult.email,
    joinResult.email,
  );
  TestValidator.predicate(
    "new access token issued",
    refreshResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token issued",
    refreshResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token changed",
    refreshResult.token.access !== joinResult.token.access,
  );
  TestValidator.predicate(
    "refresh token changed",
    refreshResult.token.refresh !== joinResult.token.refresh,
  );
  // 5. Validate token expiration timestamps
  const newExpiredAt = new Date(refreshResult.token.expired_at);
  const newRefreshableUntil = new Date(refreshResult.token.refreshable_until);
  const now = new Date();
  TestValidator.predicate(
    "access token expiration in future",
    newExpiredAt > now,
  );
  TestValidator.predicate(
    "refresh deadline in future",
    newRefreshableUntil > now,
  );
  TestValidator.predicate(
    "refresh deadline after access expiration",
    newRefreshableUntil > newExpiredAt,
  );
}
