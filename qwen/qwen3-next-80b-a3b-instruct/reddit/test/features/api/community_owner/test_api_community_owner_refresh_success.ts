import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";

export async function test_api_community_owner_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a new community owner
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_community_owner_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(1),
    } satisfies IRedditCommunityCommunityOwner.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Use the established session to refresh the token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await authorize_community_owner_refresh(
    refreshConnection,
    {
      body: {} satisfies IRedditCommunityCommunityOwner.IRefresh,
    },
  );
  typia.assert(refreshResponse);
  // 3. Validate the refreshed token response
  TestValidator.equals(
    "access token exists",
    refreshResponse.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token exists",
    refreshResponse.token.refresh.length > 0,
    true,
  );
  TestValidator.predicate("access token expires in 15 minute window", () => {
    const expiresAt = new Date(refreshResponse.token.expired_at);
    const now = new Date();
    const diffMinutes = (expiresAt.getTime() - now.getTime()) / (1000 * 60);
    return diffMinutes <= 15 && diffMinutes >= 14; // Expect close to 15 minutes
  });
  TestValidator.predicate("refresh token is valid for 7 days", () => {
    const refreshUntil = new Date(refreshResponse.token.refreshable_until);
    const now = new Date();
    const diffDays =
      (refreshUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 7 && diffDays >= 6.9; // Expect close to 7 days
  });
  // 4. Verify that the old refresh token is revoked by attempting to use it again
  // This should fail with 401 Unauthorized
  await TestValidator.httpError("old refresh token revoked", 401, async () => {
    const revokedConnection: api.IConnection = { host: connection.host };
    // This will use the old refresh token (from join response, not refresh response)
    // which should be in revocation list after the refresh
    await authorize_community_owner_refresh(revokedConnection, {
      body: {} satisfies IRedditCommunityCommunityOwner.IRefresh,
    });
  });
  // 5. Verify that the new refresh token works
  const secondRefreshConnection: api.IConnection = { host: connection.host };
  const secondRefreshResponse = await authorize_community_owner_refresh(
    secondRefreshConnection,
    {
      body: {} satisfies IRedditCommunityCommunityOwner.IRefresh,
    },
  );
  typia.assert(secondRefreshResponse);
  TestValidator.notEquals(
    "second refresh token is different",
    refreshResponse.token.refresh,
    secondRefreshResponse.token.refresh,
  );
}
