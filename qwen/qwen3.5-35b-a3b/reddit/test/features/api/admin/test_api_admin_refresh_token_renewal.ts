import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_refresh_token_renewal(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin joins the system to obtain initial authentication tokens
  const adminConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  typia.assert(initialAuth);
  // Store original tokens for comparison
  const originalAccessToken = initialAuth.token.access;
  const originalRefreshToken = initialAuth.token.refresh;
  // Step 2: Admin calls refresh endpoint with original refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_admin_refresh(refreshConnection, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies IRedditCommunityAdmin.IRefresh,
  });
  typia.assert(refreshedAuth);
  // Step 3: Verify new tokens are different from original tokens (token rotation)
  TestValidator.notEquals(
    "access token renewed",
    originalAccessToken,
    refreshedAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token renewed",
    originalRefreshToken,
    refreshedAuth.token.refresh,
  );
  // Step 4: Verify new refresh token can be used for another refresh call
  // (validating the refresh mechanism works and session extends)
  const secondRefreshConnection: api.IConnection = { host: connection.host };
  const secondRefreshedAuth = await authorize_admin_refresh(
    secondRefreshConnection,
    {
      body: {
        refresh_token: refreshedAuth.token.refresh,
      } satisfies IRedditCommunityAdmin.IRefresh,
    },
  );
  typia.assert(secondRefreshedAuth);
  // Verify second refresh produces new tokens (proving token rotation)
  TestValidator.notEquals(
    "second refresh produces new tokens",
    refreshedAuth.token.refresh,
    secondRefreshedAuth.token.refresh,
  );
  // Verify session is extended after second refresh
  TestValidator.predicate(
    "refreshable_until extended after second refresh",
    new Date(secondRefreshedAuth.token.refreshable_until) >
      new Date(refreshedAuth.token.refreshable_until),
  );
}
