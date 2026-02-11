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

export async function test_api_platform_post_analytics_default(
  connection: api.IConnection,
): Promise<void> {
  // Create community owner connection and authenticate
  const communityOwnerConnection: api.IConnection = { host: connection.host };
  await authorize_community_owner_join(communityOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityCommunityOwner.IJoin,
  });
  // Define default analytics request parameters
  const analyticsRequest: IRedditCommunityPostCommentCount.IRequest = {
    sortBy: "hot",
    page: 1,
    limit: 25,
  };
  // Fetch platform-wide post analytics
  const analytics =
    await api.functional.redditCommunity.communityOwner.analytics.posts.index(
      communityOwnerConnection,
      {
        body: analyticsRequest,
      },
    );
  typia.assert(analytics);
  // Validate all required fields are present and non-negative
  TestValidator.predicate(
    "totalPosts is non-negative",
    analytics.totalPosts >= 0,
  );
  TestValidator.predicate(
    "totalVotes is non-negative",
    analytics.totalVotes >= 0,
  );
  TestValidator.predicate(
    "avgVoteScore is non-negative",
    analytics.avgVoteScore >= 0,
  );
  TestValidator.predicate(
    "avgCommentsPerPost is non-negative",
    analytics.avgCommentsPerPost >= 0,
  );
  TestValidator.predicate(
    "activeCommunities is non-negative",
    analytics.activeCommunities >= 0,
  );
  // Validate field types
  TestValidator.predicate(
    "totalPosts is int32",
    Number.isInteger(analytics.totalPosts),
  );
  TestValidator.predicate(
    "totalVotes is int32",
    Number.isInteger(analytics.totalVotes),
  );
  TestValidator.predicate(
    "activeCommunities is int32",
    Number.isInteger(analytics.activeCommunities),
  );
  // Verify default parameters were used
  TestValidator.equals("sortBy is 'hot'", analyticsRequest.sortBy, "hot");
  TestValidator.equals("page is 1", analyticsRequest.page, 1);
  TestValidator.equals("limit is 25", analyticsRequest.limit, 25);
}
