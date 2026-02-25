import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPostAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostAnalytic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

export async function test_api_community_owner_post_analytics_min_vote_score_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create a community owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerCredentials: IRedditCommunityCommunityOwner.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
  };
  await authorize_community_owner_join(ownerConnection, {
    body: ownerCredentials,
  });
  // Create a member account to create the community
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials: IRedditCommunityMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(),
  };
  await authorize_member_join(memberConnection, { body: memberCredentials });
  // Create a community as the member
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // Create a new connection for the owner to perform analytics
  const ownerAnalyticsConnection: api.IConnection = { host: connection.host };
  await authorize_community_owner_login(ownerAnalyticsConnection, {
    body: {
      email: ownerCredentials.email,
      password: ownerCredentials.password,
    } satisfies IRedditCommunityCommunityOwner.ILogin,
  });
  // Request analytics with minVoteScore filter
  const analyticsResponse =
    await api.functional.redditCommunity.communityOwner.communities.analytics.posts.search(
      ownerAnalyticsConnection,
      {
        communityId: community.id,
        body: {
          minVoteScore: 10,
        } satisfies IRedditCommunityPostAnalytic.IRequest,
      },
    );
  typia.assert(analyticsResponse);
  // Verify response structure and type safety
  TestValidator.predicate(
    "analytics contains valid date",
    analyticsResponse.date !== undefined,
  );
  TestValidator.predicate(
    "analytics has total posts count",
    analyticsResponse.total_posts >= 0,
  );
  TestValidator.predicate(
    "analytics has avg_vote_score",
    typeof analyticsResponse.avg_vote_score === "number",
  );
  TestValidator.predicate(
    "analytics has total upvotes",
    analyticsResponse.total_upvotes >= 0,
  );
  TestValidator.predicate(
    "analytics has total downvotes",
    analyticsResponse.total_downvotes >= 0,
  );
  TestValidator.predicate(
    "analytics has total comments",
    analyticsResponse.total_comments >= 0,
  );
}
