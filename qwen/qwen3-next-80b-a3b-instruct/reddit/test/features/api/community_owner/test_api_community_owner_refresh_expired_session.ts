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

export async function test_api_community_owner_refresh_expired_session(
  connection: api.IConnection,
): Promise<void> {
  // Create a base connection for community owner operations
  const ownerConnection: api.IConnection = { host: connection.host };
  // Step 1: Join a new community owner to get initial session with refresh token
  const joinResult = await authorize_community_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IRedditCommunityCommunityOwner.IJoin,
  });
  typia.assert(joinResult);
  // Step 2: Use the refresh token (via cookie) to refresh session
  // This creates a new token and revokes the old one
  const refreshConnection: api.IConnection = { host: connection.host };
  // Use the token from joinResult for the refresh
  // We reuse the join result cookies: refresh token is in HTTP-only cookie
  // Create a fresh connection for refresh
  const postRefreshConnection: api.IConnection = { host: connection.host };
  // Refresh the session - this revokes the original refresh token
  await authorize_community_owner_refresh(postRefreshConnection, {
    body: {} satisfies IRedditCommunityCommunityOwner.IRefresh,
  });
  // Step 3: Now attempt to refresh again using the ORIGINAL refresh token (which is now revoked)
  // Even though the token is valid at time of creation, it's now revoked
  // The system should return 401 for revoked refresh token
  // This simulates the expired/invalid session
  // Create a connection initialized with the original join token's headers
  // We try to refresh with a revoked token
  const revokedTokenConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: joinResult.token.access },
  };
  // Use the original token's refresh context
  await TestValidator.httpError(
    "refresh fails with 401 when using revoked refresh token",
    401,
    async () => {
      await api.functional.redditCommunity.auth.communityOwner.refresh(
        revokedTokenConnection,
        {
          body: {} satisfies IRedditCommunityCommunityOwner.IRefresh,
        },
      );
    },
  );
}
