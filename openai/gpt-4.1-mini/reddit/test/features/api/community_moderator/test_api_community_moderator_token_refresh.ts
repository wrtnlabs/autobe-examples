import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

export async function test_api_community_moderator_token_refresh(
  connection: api.IConnection,
) {
  // 1. Register a new community moderator user (join)
  const joinBody = {
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "TestPassword123!",
  } satisfies IRedditCommunityCommunityModerator.IJoin;

  const joinedAuthorized: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join.joinCommunityModerator(
      connection,
      {
        body: joinBody,
      },
    );
  typia.assert(joinedAuthorized);

  // 2. Extract the refresh token from the join result
  const refreshToken: string = joinedAuthorized.token.refresh;

  // 3. Call the refresh endpoint with refresh token
  const refreshBody = {
    refresh_token: refreshToken,
  } satisfies IRedditCommunityCommunityModerator.IRefresh;

  const refreshedAuthorized: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.refresh.refreshCommunityModeratorTokens(
      connection,
      {
        body: refreshBody,
      },
    );
  typia.assert(refreshedAuthorized);

  // 4. Validate that the refreshed access token is different from original
  TestValidator.notEquals(
    "refreshed access token should differ from original",
    refreshedAuthorized.token.access,
    joinedAuthorized.token.access,
  );

  // 5. Confirm that user id and email remain the same
  TestValidator.equals(
    "user id should remain the same after refresh",
    refreshedAuthorized.id,
    joinedAuthorized.id,
  );
  TestValidator.equals(
    "user email should remain the same after refresh",
    refreshedAuthorized.email,
    joinedAuthorized.email,
  );
}
