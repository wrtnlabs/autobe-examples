import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityPostCommentCount } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostCommentCount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";

export async function test_api_post_analytics_hot_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Create community moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_community_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityCommunityModerator.IJoin,
  });
  // Verify the analytics endpoint returns correct structure with hot sorting
  const result: IRedditCommunityPostCommentCount.ISummary =
    await api.functional.redditCommunity.communityModerator.analytics.posts.index(
      moderatorConnection,
      {
        body: {
          sortBy: "hot",
          timeFilter: "week",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(result);
  // Verify all required fields exist in response
  TestValidator.predicate("totalPosts is non-negative", result.totalPosts >= 0);
  TestValidator.predicate("totalVotes is non-negative", result.totalVotes >= 0);
  TestValidator.predicate(
    "avgVoteScore is non-negative",
    result.avgVoteScore >= 0,
  );
  TestValidator.predicate(
    "avgCommentsPerPost is non-negative",
    result.avgCommentsPerPost >= 0,
  );
  TestValidator.predicate(
    "activeCommunities is non-negative",
    result.activeCommunities >= 0,
  );
  // Verify pagination returns same totals with different timeFilter (which should be ignored for 'hot')
  const paginatedResult: IRedditCommunityPostCommentCount.ISummary =
    await api.functional.redditCommunity.communityModerator.analytics.posts.index(
      moderatorConnection,
      {
        body: {
          sortBy: "hot",
          timeFilter: "all",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(paginatedResult);
  // Verify all fields match between different timeFilter values (timeFilter should be ignored for 'hot' sorting)
  TestValidator.equals(
    "total posts count unchanged",
    result.totalPosts,
    paginatedResult.totalPosts,
  );
  TestValidator.equals(
    "total votes unchanged",
    result.totalVotes,
    paginatedResult.totalVotes,
  );
  TestValidator.equals(
    "average vote score unchanged",
    result.avgVoteScore,
    paginatedResult.avgVoteScore,
  );
  TestValidator.equals(
    "average comments per post unchanged",
    result.avgCommentsPerPost,
    paginatedResult.avgCommentsPerPost,
  );
  TestValidator.equals(
    "active communities unchanged",
    result.activeCommunities,
    paginatedResult.activeCommunities,
  );
  // Verify with another timeFilter to confirm it's ignored
  const result2: IRedditCommunityPostCommentCount.ISummary =
    await api.functional.redditCommunity.communityModerator.analytics.posts.index(
      moderatorConnection,
      {
        body: {
          sortBy: "hot",
          timeFilter: "today",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(result2);
  TestValidator.equals(
    "timeFilter ignored - total posts unchanged",
    result.totalPosts,
    result2.totalPosts,
  );
  TestValidator.equals(
    "timeFilter ignored - total votes unchanged",
    result.totalVotes,
    result2.totalVotes,
  );
  TestValidator.equals(
    "timeFilter ignored - avg vote score unchanged",
    result.avgVoteScore,
    result2.avgVoteScore,
  );
  TestValidator.equals(
    "timeFilter ignored - avg comments per post unchanged",
    result.avgCommentsPerPost,
    result2.avgCommentsPerPost,
  );
  TestValidator.equals(
    "timeFilter ignored - active communities unchanged",
    result.activeCommunities,
    result2.activeCommunities,
  );
}
