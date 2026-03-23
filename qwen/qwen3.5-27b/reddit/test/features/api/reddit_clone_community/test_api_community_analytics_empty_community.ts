import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
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
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

/**
 * Test that analytics for a newly created community with no activity returns zeros instead of null values.
 *
 * This test validates that when a community is created with no posts, comments, or additional subscribers,
 * the analytics endpoint returns proper zero values (0) instead of null for all numeric fields.
 * This ensures frontend applications can safely perform arithmetic operations without null checks.
 */
export async function test_api_community_analytics_empty_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      bio: null,
      avatar_uri: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  // 2. Create a new empty community
  const community: IRedditCloneCommunity =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon: null,
        } satisfies IRedditCloneCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Retrieve analytics for the newly created empty community
  const analytics: IRedditCloneCommunity.IAnalytic =
    await api.functional.redditClone.member.communities.analytics(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(analytics);
  // 4. Validate that all numeric fields return zeros, not null
  // Subscriber metrics
  TestValidator.equals(
    "subscriber_count is 1 (owner)",
    analytics.subscriber_count,
    1,
  );
  TestValidator.equals(
    "subscribers_gained_7d is 0",
    analytics.subscribers_gained_7d,
    0,
  );
  TestValidator.equals(
    "subscribers_gained_30d is 0",
    analytics.subscribers_gained_30d,
    0,
  );
  TestValidator.equals(
    "subscribers_gained_90d is 0",
    analytics.subscribers_gained_90d,
    0,
  );
  // Post metrics
  TestValidator.equals("posts_total is 0", analytics.posts_total, 0);
  TestValidator.equals("posts_created_7d is 0", analytics.posts_created_7d, 0);
  TestValidator.equals(
    "posts_created_30d is 0",
    analytics.posts_created_30d,
    0,
  );
  TestValidator.equals(
    "posts_created_90d is 0",
    analytics.posts_created_90d,
    0,
  );
  TestValidator.equals(
    "posts_avg_score is 0 (not null)",
    analytics.posts_avg_score,
    0,
  );
  // Comment metrics
  TestValidator.equals("comments_total is 0", analytics.comments_total, 0);
  TestValidator.equals(
    "comments_avg_score is 0 (not null)",
    analytics.comments_avg_score,
    0,
  );
  // Moderator metrics
  TestValidator.equals(
    "moderators_count is 1 (owner)",
    analytics.moderators_count,
    1,
  );
  // Validate basic community info
  TestValidator.equals("community id matches", analytics.id, community.id);
  TestValidator.equals(
    "community name matches",
    analytics.name,
    community.name,
  );
  TestValidator.predicate("created_at is valid date-time", () => {
    const date = new Date(analytics.created_at);
    return !isNaN(date.getTime());
  });
}
