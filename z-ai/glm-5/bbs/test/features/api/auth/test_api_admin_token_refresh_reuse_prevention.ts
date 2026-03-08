import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that refresh tokens are one-time-use and cannot be reused.
 * This prevents token replay attacks by ensuring each refresh token
 * can only be used once - after successful refresh, the old token is
 * invalidated and subsequent attempts with it should fail.
 */
export async function test_api_admin_token_refresh_reuse_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin account and obtain initial tokens
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {});
  typia.assert(authorized);
  // Capture the initial refresh token for reuse test
  const initialRefreshToken = authorized.token.refresh;
  // Step 2: First token refresh - should succeed
  const refreshConnection: api.IConnection = { host: connection.host };
  const firstRefresh = await authorize_admin_refresh(refreshConnection, {
    body: { refreshToken: initialRefreshToken },
  });
  typia.assert(firstRefresh);
  // Validate that new refresh token is different from the initial one
  TestValidator.notEquals(
    "new refresh token should differ from initial token",
    firstRefresh.token.refresh,
    initialRefreshToken,
  );
  // Step 3: Attempt to reuse the old (invalidated) refresh token - should fail
  await TestValidator.error(
    "reusing invalidated refresh token should fail",
    async () => {
      const reusedConnection: api.IConnection = { host: connection.host };
      await authorize_admin_refresh(reusedConnection, {
        body: { refreshToken: initialRefreshToken },
      });
    },
  );
}
