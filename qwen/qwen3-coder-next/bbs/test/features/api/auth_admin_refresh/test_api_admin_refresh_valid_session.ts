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

export async function test_api_admin_refresh_valid_session(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_admin_join(joinConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  typia.assert(joinResult);
  // Step 2: Login as admin to establish session
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_admin_login(loginConnection, {
    body: typia.random<IDiscussionBoardAdmin.ILogin>(),
  });
  typia.assert(loginResult);
  // Step 3: Extract original tokens for comparison
  const originalToken = loginResult.token;
  typia.assert(originalToken);
  const originalRefreshToken = originalToken.refresh;
  // Step 4: Prepare refresh request body with the refresh token
  const refreshBody = {
    refresh_token: originalRefreshToken,
  } satisfies IDiscussionBoardAdmin.IRefresh;
  // Step 5: Use refresh token to get new tokens
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_admin_refresh(refreshConnection, {
    body: refreshBody,
  });
  typia.assert(refreshResult);
  // Step 6: Validate token rotation occurred
  TestValidator.notEquals(
    "access token changed",
    originalToken.access,
    refreshResult.token.access,
  );
  TestValidator.notEquals(
    "refresh token changed",
    originalToken.refresh,
    refreshResult.token.refresh,
  );
  // Step 7: Validate token structure and formats
  typia.assert<string & tags.Format<"date-time">>(
    refreshResult.token.expired_at,
  );
  typia.assert<string & tags.Format<"date-time">>(
    refreshResult.token.refreshable_until,
  );
  // Step 8: Verify new tokens are valid by using them for another refresh operation
  const newRefreshToken = refreshResult.token.refresh;
  const secondRefreshBody = {
    refresh_token: newRefreshToken,
  } satisfies IDiscussionBoardAdmin.IRefresh;
  const secondRefreshConnection: api.IConnection = { host: connection.host };
  const secondRefreshResult = await authorize_admin_refresh(
    secondRefreshConnection,
    {
      body: secondRefreshBody,
    },
  );
  typia.assert(secondRefreshResult);
}
