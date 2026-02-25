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

export async function test_api_super_admin_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register super admin account to obtain valid refresh token
  const superAdminConnection: api.IConnection = { host: connection.host };
  const joined = await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection,
    {
      body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
    },
  );
  typia.assert(joined);
  // Step 2: Extract refresh token from join response
  const refreshToken = joined.token.refresh;
  const originalRefreshableUntil = joined.token.refreshable_until;
  // Step 3: Create dedicated connection for refresh operations
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed =
    await api.functional.discussionBoard.auth.superAdmin.refresh(
      refreshConnection,
      {
        body: {
          refresh_token: refreshToken,
        } satisfies IDiscussionBoardSuperAdmin.IRefresh,
      },
    );
  typia.assert(refreshed);
  // Step 4: Validate new access token is returned with fresh expiration
  TestValidator.notEquals(
    "new access token is different",
    joined.token.access,
    refreshed.token.access,
  );
  TestValidator.equals(
    "new access token is valid",
    refreshed.token.access.startsWith("eyJ"),
    true,
  );
  // Step 5: Confirm refresh token is still valid (not rotated)
  TestValidator.equals(
    "refresh token remains same",
    joined.token.refresh,
    refreshed.token.refresh,
  );
  TestValidator.predicate(
    "session remains active",
    new Date(refreshed.token.refreshable_until) > new Date(),
  );
  // Step 6: Verify new access token works with refresh endpoint (use same connection)
  const secondRefreshed =
    await api.functional.discussionBoard.auth.superAdmin.refresh(
      refreshConnection,
      {
        body: {
          refresh_token: refreshed.token.refresh,
        } satisfies IDiscussionBoardSuperAdmin.IRefresh,
      },
    );
  typia.assert(secondRefreshed);
  // Step 7: Confirm expiration timestamps have advanced
  const originalExpiredAt = new Date(joined.token.expired_at).getTime();
  const refreshedExpiredAt = new Date(refreshed.token.expired_at).getTime();
  TestValidator.predicate(
    "access token expiration advanced",
    refreshedExpiredAt - originalExpiredAt > 0,
  );
  const originalRefreshable = new Date(originalRefreshableUntil).getTime();
  const newRefreshable = new Date(refreshed.token.refreshable_until).getTime();
  TestValidator.predicate(
    "refreshable until advanced",
    newRefreshable - originalRefreshable > 0,
  );
}
