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

export async function test_api_post_analytics_controversial_sorting_and_search(
  connection: api.IConnection,
): Promise<void> {
  // Create community moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorData = await authorize_community_moderator_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      },
    },
  );
  // Update connection with authentication token
  moderatorConnection.headers = {
    Authorization: `Bearer ${moderatorData.access_token}`,
  };
  // Call the analytics endpoint with controversial sort and search parameter
  const request: IRedditCommunityPostCommentCount.IRequest = {
    sortBy: "controversial",
    page: 1,
    limit: 10,
    search: "test", // Test search parameter
  };
  const response =
    await api.functional.redditCommunity.communityModerator.analytics.posts.index(
      moderatorConnection,
      { body: request },
    );
  typia.assert(response);
  // Validate that all required fields are present and properly typed
  TestValidator.predicate(
    "totalPosts is a positive integer",
    response.totalPosts >= 0,
  );
  TestValidator.predicate(
    "totalVotes is a positive integer",
    response.totalVotes >= 0,
  );
  TestValidator.predicate(
    "avgVoteScore is non-negative",
    response.avgVoteScore >= 0,
  );
  TestValidator.predicate(
    "avgCommentsPerPost is non-negative",
    response.avgCommentsPerPost >= 0,
  );
  TestValidator.predicate(
    "activeCommunities is a positive integer",
    response.activeCommunities >= 0,
  );
}
