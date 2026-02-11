import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_community_analytics_owner_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member session through registration
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: RandomGenerator.name(2),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create community owned by that member
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community owner matches member",
    community.owner.id,
    member.id,
  );
  // 3. Call analytics endpoint with communityId from created community
  const analytics =
    await api.functional.redditPlatform.member.communities.analytics.at(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(analytics);
  // 4. Validate response contains all expected fields
  TestValidator.equals(
    "communityId matches",
    analytics.communityId,
    community.id,
  );
  TestValidator.equals(
    "communityName matches",
    analytics.communityName,
    community.name,
  );
  // Engagement metrics validation
  TestValidator.predicate(
    "viewCount is non-negative",
    analytics.engagement.viewCount >= 0,
  );
  TestValidator.predicate(
    "voteCount is non-negative",
    analytics.engagement.voteCount >= 0,
  );
  TestValidator.predicate(
    "commentCount is non-negative",
    analytics.engagement.commentCount >= 0,
  );
  TestValidator.predicate(
    "averageVoteScore is non-negative",
    analytics.engagement.averageVoteScore >= 0,
  );
  // Content metrics validation
  TestValidator.predicate(
    "postCount is non-negative",
    analytics.content.postCount >= 0,
  );
  TestValidator.predicate(
    "averageKarma is non-negative",
    analytics.content.averageKarma >= 0,
  );
  TestValidator.predicate(
    "textPosts is non-negative",
    analytics.content.contentTypes.textPosts >= 0,
  );
  TestValidator.predicate(
    "linkPosts is non-negative",
    analytics.content.contentTypes.linkPosts >= 0,
  );
  TestValidator.predicate(
    "imagePosts is non-negative",
    analytics.content.contentTypes.imagePosts >= 0,
  );
  // User metrics validation
  TestValidator.predicate(
    "memberCount is non-negative",
    analytics.users.memberCount >= 0,
  );
  TestValidator.predicate(
    "activeMembers is non-negative",
    analytics.users.activeMembers >= 0,
  );
  TestValidator.predicate(
    "postingFrequency is non-negative",
    analytics.users.postingFrequency >= 0,
  );
  // Growth metrics validation
  TestValidator.predicate(
    "newMembers is non-negative",
    analytics.growth.newMembers >= 0,
  );
  TestValidator.predicate(
    "newPosts is non-negative",
    analytics.growth.newPosts >= 0,
  );
  TestValidator.predicate(
    "growthRate is non-negative",
    analytics.growth.growthRate >= 0,
  );
  // Time range validation - period enum check
  TestValidator.predicate(
    "period is valid enum value",
    ["TODAY", "WEEK", "MONTH", "YEAR", "ALL_TIME"].includes(
      analytics.timeRange.period,
    ),
  );
}
