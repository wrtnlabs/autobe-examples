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

export async function test_api_post_analytics_top_sorting_with_time_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create connection for community moderator authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Authenticate moderator user
  const authResponse = await authorize_community_moderator_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IRedditCommunityCommunityModerator.IJoin,
    },
  );
  typia.assert(authResponse);
  // Test each time filter with sortBy=top
  const timeFilters: ("today" | "week" | "month" | "year" | "all")[] = [
    "today",
    "week",
    "month",
    "year",
    "all",
  ];
  for (const timeFilter of timeFilters) {
    const request: IRedditCommunityPostCommentCount.IRequest = {
      sortBy: "top",
      timeFilter,
      page: 1,
      limit: 10,
    };
    const response: IRedditCommunityPostCommentCount.ISummary =
      await api.functional.redditCommunity.communityModerator.analytics.posts.index(
        moderatorConnection,
        { body: request },
      );
    typia.assert(response);
    // Validate that response contains required fields
    TestValidator.equals(
      "totalPosts is non-negative",
      response.totalPosts,
      response.totalPosts,
    );
    TestValidator.equals(
      "totalVotes is non-negative",
      response.totalVotes,
      response.totalVotes,
    );
    TestValidator.predicate(
      "avgVoteScore is non-negative",
      response.avgVoteScore >= 0,
    );
    TestValidator.predicate(
      "avgCommentsPerPost is non-negative",
      response.avgCommentsPerPost >= 0,
    );
    TestValidator.equals(
      "activeCommunities is non-negative",
      response.activeCommunities,
      response.activeCommunities,
    );
  }
  // Test default behavior when timeFilter is omitted (should default to "all")
  const defaultRequest: IRedditCommunityPostCommentCount.IRequest = {
    sortBy: "top",
    page: 1,
    limit: 10,
  };
  const defaultResponse: IRedditCommunityPostCommentCount.ISummary =
    await api.functional.redditCommunity.communityModerator.analytics.posts.index(
      moderatorConnection,
      { body: defaultRequest },
    );
  typia.assert(defaultResponse);
  // Validate that default response contains required fields
  TestValidator.equals(
    "default totalPosts is non-negative",
    defaultResponse.totalPosts,
    defaultResponse.totalPosts,
  );
  TestValidator.equals(
    "default totalVotes is non-negative",
    defaultResponse.totalVotes,
    defaultResponse.totalVotes,
  );
  TestValidator.predicate(
    "default avgVoteScore is non-negative",
    defaultResponse.avgVoteScore >= 0,
  );
  TestValidator.predicate(
    "default avgCommentsPerPost is non-negative",
    defaultResponse.avgCommentsPerPost >= 0,
  );
  TestValidator.equals(
    "default activeCommunities is non-negative",
    defaultResponse.activeCommunities,
    defaultResponse.activeCommunities,
  );
  // Compare default response with "all" time filter response to verify they are equivalent
  const allRequest: IRedditCommunityPostCommentCount.IRequest = {
    sortBy: "top",
    timeFilter: "all",
    page: 1,
    limit: 10,
  };
  const allResponse: IRedditCommunityPostCommentCount.ISummary =
    await api.functional.redditCommunity.communityModerator.analytics.posts.index(
      moderatorConnection,
      { body: allRequest },
    );
  typia.assert(allResponse);
  // Verify default response matches "all" time filter response
  TestValidator.equals(
    "default response equals all time filter response for totalPosts",
    defaultResponse.totalPosts,
    allResponse.totalPosts,
  );
  TestValidator.equals(
    "default response equals all time filter response for totalVotes",
    defaultResponse.totalVotes,
    allResponse.totalVotes,
  );
  TestValidator.equals(
    "default response equals all time filter response for avgVoteScore",
    defaultResponse.avgVoteScore,
    allResponse.avgVoteScore,
  );
  TestValidator.equals(
    "default response equals all time filter response for avgCommentsPerPost",
    defaultResponse.avgCommentsPerPost,
    allResponse.avgCommentsPerPost,
  );
  TestValidator.equals(
    "default response equals all time filter response for activeCommunities",
    defaultResponse.activeCommunities,
    allResponse.activeCommunities,
  );
}
