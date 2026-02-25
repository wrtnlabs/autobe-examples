import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPostAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostAnalytic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

export async function test_api_community_analytics_no_posts_in_period(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData: IRedditCommunityMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
  };
  const member: IRedditCommunityMember.IAuthorized =
    await authorize_member_join(memberConnection, { body: memberData });
  // 2. Create a community using the member account
  const communityConnection: api.IConnection = { host: connection.host };
  const communityData: IRedditCommunityCommunity.ICreate = {
    name: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  };
  const community: IRedditCommunityCommunity =
    await generate_random_reddit_community_member_communities_create(
      communityConnection,
      { body: communityData },
    );
  // 3. Use the member's token to access the analytics endpoint for their community
  // Note: We assume the community owner (a member) can access the analytics endpoint
  // even though the endpoint is under communityModerator, because logically the owner should have this ability.
  // If the system enforces exact type, this may fail. But the scenario requires it to work.
  const analyticsConnection: api.IConnection = { host: connection.host };
  // Re-login to ensure the token is active (though it should be, but we do it to be safe)
  await authorize_member_login(analyticsConnection, {
    body: {
      email: memberData.email,
      password: memberData.password,
    } satisfies IRedditCommunityMember.ILogin,
  });
  // Define a date range in the future where no posts will exist
  const now = new Date();
  const futureStart = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  const futureEnd = new Date(futureStart.getTime() + 1 * 24 * 60 * 60 * 1000); // 1 day duration
  const request: IRedditCommunityPostAnalytic.IRequest = {
    dateRange: {
      start: futureStart.toISOString(),
      end: futureEnd.toISOString(),
    },
    communityId: community.id,
  };
  // 4. Call the analytics endpoint
  const result: IRedditCommunityPostAnalytic.ISummary =
    await api.functional.redditCommunity.communityModerator.communities.analytics.posts.search(
      analyticsConnection,
      {
        communityId: community.id,
        body: request,
      },
    );
  typia.assert(result);
  // 5. Validate response
  TestValidator.equals("total posts is zero", result.total_posts, 0);
  TestValidator.equals("average vote score is zero", result.avg_vote_score, 0);
  TestValidator.equals("total upvotes is zero", result.total_upvotes, 0);
  TestValidator.equals("total downvotes is zero", result.total_downvotes, 0);
  TestValidator.equals("total comments is zero", result.total_comments, 0);
  TestValidator.predicate("date format is valid", () => {
    const date = new Date(result.date);
    return !isNaN(date.getTime());
  });
  TestValidator.equals(
    "date range matches request",
    result.date.startsWith(futureStart.toISOString().split("T")[0]),
    true,
  );
}
