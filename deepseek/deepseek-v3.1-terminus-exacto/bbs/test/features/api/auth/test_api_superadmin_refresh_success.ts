import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create initial super admin session using join
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_super_admin_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(joinResult);
  // Save original tokens for comparison
  const originalAccessToken = joinResult.token.access;
  const originalRefreshToken = joinResult.token.refresh;
  // 2. Create new connection for refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // 3. Perform token refresh
  const refreshResult = await authorize_super_admin_refresh(refreshConnection, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies IDiscussionBoardSuperAdmin.IRefresh,
  });
  typia.assert(refreshResult);
  // 4. Validate token refresh results
  const newAccessToken = refreshResult.token.access;
  const newRefreshToken = refreshResult.token.refresh;
  // Both tokens should be new (refresh token rotation)
  TestValidator.notEquals(
    "access token changed",
    newAccessToken,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "refresh token changed",
    newRefreshToken,
    originalRefreshToken,
  );
  // Validate token structure
  TestValidator.predicate(
    "access token not empty",
    newAccessToken.trim().length > 0,
  );
  TestValidator.predicate(
    "refresh token not empty",
    newRefreshToken.trim().length > 0,
  );
  // Timestamps should be valid ISO strings
  TestValidator.predicate("expired_at valid", () => {
    try {
      new Date(refreshResult.token.expired_at);
      return true;
    } catch {
      return false;
    }
  });
  TestValidator.predicate("refreshable_until valid", () => {
    try {
      new Date(refreshResult.token.refreshable_until);
      return true;
    } catch {
      return false;
    }
  });
  // 5. Test that new access token works - can't test super admin operations without API endpoints,
  // but we can verify the connection has the Authorization header set by authorize_super_admin_refresh
  TestValidator.predicate(
    "refresh connection has Authorization header",
    !!refreshConnection.headers?.Authorization,
  );
  // 6. Test old refresh token cannot be reused
  const badRefreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("old refresh token invalidated", async () => {
    await authorize_super_admin_refresh(badRefreshConnection, {
      body: {
        refresh_token: originalRefreshToken,
      } satisfies IDiscussionBoardSuperAdmin.IRefresh,
    });
  });
  // 7. Validate super admin identity consistency
  TestValidator.equals(
    "super admin ID unchanged",
    refreshResult.id,
    joinResult.id,
  );
  TestValidator.equals(
    "super admin email unchanged",
    refreshResult.email,
    joinResult.email,
  );
  TestValidator.equals(
    "super admin grade is 'super'",
    refreshResult.admin_grade,
    "super",
  );
  // 8. Validate timestamps are reasonable (refreshable_until should be later than expired_at)
  const expiredAt = new Date(refreshResult.token.expired_at);
  const refreshableUntil = new Date(refreshResult.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until after expired_at",
    refreshableUntil.getTime() > expiredAt.getTime(),
  );
}
