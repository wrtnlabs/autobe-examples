import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_member_communities_moderators_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_community_moderator } from "../../../prepare/prepare_random_reddit_clone_community_moderator";

/**
 * Test that a moderator can access community analytics.
 *
 * This test verifies that:
 * 1. A community owner can create a community
 * 2. The owner can add another member as a moderator
 * 3. The moderator can successfully retrieve analytics for the community
 * 4. Analytics data contains all expected fields with valid values
 */
export async function test_api_community_analytics_moderator_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as community owner (member A)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "123456",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create a new community as owner
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCloneCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Register and authenticate as future moderator (member B)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "123456",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(moderatorAuth);
  // 4. Owner adds member B as moderator
  await generate_random_reddit_clone_member_communities_moderators_create(
    ownerConnection,
    {
      body: {
        memberId: moderatorAuth.id,
      } satisfies IRedditCloneCommunityModerator.ICreate,
      params: {
        communityId: community.id,
      },
    },
  );
  // 5. Moderator retrieves analytics for the community
  const analytics =
    await api.functional.redditClone.member.communities.analytics(
      moderatorConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(analytics);
  // 6. Validate analytics data structure and values
  TestValidator.equals("community id matches", analytics.id, community.id);
  TestValidator.equals(
    "community name matches",
    analytics.name,
    community.name,
  );
  TestValidator.equals(
    "created_at matches",
    analytics.created_at,
    community.created_at,
  );
  TestValidator.predicate(
    "subscriber count is non-negative",
    analytics.subscriber_count >= 0,
  );
  TestValidator.predicate(
    "subscribers gained 7d is non-negative",
    analytics.subscribers_gained_7d >= 0,
  );
  TestValidator.predicate(
    "subscribers gained 30d is non-negative",
    analytics.subscribers_gained_30d >= 0,
  );
  TestValidator.predicate(
    "subscribers gained 90d is non-negative",
    analytics.subscribers_gained_90d >= 0,
  );
  TestValidator.predicate(
    "posts total is non-negative",
    analytics.posts_total >= 0,
  );
  TestValidator.predicate(
    "posts created 7d is non-negative",
    analytics.posts_created_7d >= 0,
  );
  TestValidator.predicate(
    "posts created 30d is non-negative",
    analytics.posts_created_30d >= 0,
  );
  TestValidator.predicate(
    "posts created 90d is non-negative",
    analytics.posts_created_90d >= 0,
  );
  TestValidator.predicate(
    "posts avg score is a number",
    typeof analytics.posts_avg_score === "number",
  );
  TestValidator.predicate(
    "comments total is non-negative",
    analytics.comments_total >= 0,
  );
  TestValidator.predicate(
    "comments avg score is a number",
    typeof analytics.comments_avg_score === "number",
  );
  TestValidator.predicate(
    "moderators count is at least 2 (owner + mod)",
    analytics.moderators_count >= 2,
  );
}
