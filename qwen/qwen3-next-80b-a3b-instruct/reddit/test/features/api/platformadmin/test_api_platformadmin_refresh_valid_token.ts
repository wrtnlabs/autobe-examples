import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_platformadmin_refresh_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create platform admin and obtain initial tokens via join
  const adminConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_platform_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityPlatformAdmin.IJoin,
  });
  typia.assert(joined);
  // 2. Extract the refresh token for refresh operation
  const refreshToken = joined.token.refresh;
  const refreshBody: IRedditCommunityPlatformAdmin.IRefresh = {
    refresh_token: refreshToken,
  };
  // 3. Perform refresh using the valid refresh token
  const refreshed = await authorize_platform_admin_refresh(adminConnection, {
    body: refreshBody,
  });
  typia.assert(refreshed);
  // 4. Validate that refresh produced new tokens
  TestValidator.notEquals(
    "new access token differs from old",
    joined.token.access,
    refreshed.token.access,
  );
  TestValidator.notEquals(
    "new refresh token differs from old",
    joined.token.refresh,
    refreshed.token.refresh,
  );
  TestValidator.equals(
    "new expired_at is set",
    typeof refreshed.token.expired_at,
    "string",
  );
  TestValidator.equals(
    "new refreshable_until is set",
    typeof refreshed.token.refreshable_until,
    "string",
  );
  // 5. Verify the refreshed token is functional
  const testConnection: api.IConnection = { host: connection.host };
  testConnection.headers = { Authorization: refreshed.token.access };
  const testResponse =
    await api.functional.redditCommunity.auth.platformadmin.refresh(
      testConnection,
      { body: refreshBody },
    );
  typia.assert(testResponse);
  // 6. Assurance: can't reuse old refresh token (it should be revoked)
  const revokedConnection: api.IConnection = { host: connection.host };
  const oldRefreshBody: IRedditCommunityPlatformAdmin.IRefresh = {
    refresh_token: refreshToken,
  };
  await TestValidator.error(
    "old refresh token rejected after refresh",
    async () => {
      await authorize_platform_admin_refresh(revokedConnection, {
        body: oldRefreshBody,
      });
    },
  );
}
