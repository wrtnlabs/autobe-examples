import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityPostCommentCount } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostCommentCount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";

export async function test_api_platform_post_analytics_with_community_search_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as community owner
  const communityOwnerConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_community_owner_join(
    communityOwnerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IRedditCommunityCommunityOwner.IJoin,
    },
  );
  typia.assert(authResponse);
  // 2. Update connection with authentication token
  communityOwnerConnection.headers = {
    Authorization: `Bearer ${authResponse.token.access}`,
  };
  // 3. Define search parameters for analytics
  const searchParams: IRedditCommunityPostCommentCount.IRequest = {
    sortBy: "controversial",
    page: 2,
    limit: 5,
    search: "tech",
  };
  // 4. Call analytics endpoint with parameters
  const analytics =
    await api.functional.redditCommunity.communityOwner.analytics.posts.index(
      communityOwnerConnection,
      { body: searchParams },
    );
  typia.assert(analytics);
  // 5. Validate that response contains aggregated metrics
  TestValidator.predicate("totalPosts >= 0", analytics.totalPosts >= 0);
  TestValidator.predicate("totalVotes >= 0", analytics.totalVotes >= 0);
  TestValidator.predicate("avgVoteScore >= 0", analytics.avgVoteScore >= 0);
  TestValidator.predicate(
    "avgCommentsPerPost >= 0",
    analytics.avgCommentsPerPost >= 0,
  );
  TestValidator.predicate(
    "activeCommunities >= 0",
    analytics.activeCommunities >= 0,
  );
}
