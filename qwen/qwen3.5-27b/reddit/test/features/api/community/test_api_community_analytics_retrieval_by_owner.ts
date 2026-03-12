import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdmin";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

/**
 * Test that a community owner can successfully retrieve comprehensive analytics for their community.
 *
 * This test verifies:
 * 1. Community owner authentication and authorization
 * 2. Analytics endpoint returns all expected fields
 * 3. Numeric fields return actual values (not null)
 * 4. Analytics data structure matches IRedditCloneCommunity.IAnalytic
 */
export async function test_api_community_analytics_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin (for platform access, though not directly used in this test)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      username: "admin_user",
      displayName: "Admin User",
    },
  });
  // 2. Setup member who will create and own the community
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: "owner@test.com",
      password: "1234",
      username: "community_owner",
      display_name: "Community Owner",
    },
  });
  // 3. Create a community (member becomes the owner)
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 4. Retrieve analytics for the community as the owner
  const analytics =
    await api.functional.redditClone.admin.communities.analytics(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(analytics);
  // 5. Validate analytics structure and content
  TestValidator.equals("community id matches", analytics.id, community.id);
  TestValidator.equals(
    "community name matches",
    analytics.name,
    community.name,
  );
  TestValidator.predicate(
    "created_at is valid",
    analytics.created_at.length > 0,
  );
  // 6. Verify subscriber metrics (owner is auto-subscribed, so at least 1)
  TestValidator.predicate(
    "subscriber_count is at least 1",
    analytics.subscriber_count >= 1,
  );
  TestValidator.predicate(
    "subscribers_gained_7d is non-negative",
    analytics.subscribers_gained_7d >= 0,
  );
  TestValidator.predicate(
    "subscribers_gained_30d is non-negative",
    analytics.subscribers_gained_30d >= 0,
  );
  TestValidator.predicate(
    "subscribers_gained_90d is non-negative",
    analytics.subscribers_gained_90d >= 0,
  );
  // 7. Verify post metrics (new community has 0 posts)
  TestValidator.equals(
    "posts_total is 0 for new community",
    analytics.posts_total,
    0,
  );
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
    "posts_avg_score is 0 for no posts",
    analytics.posts_avg_score,
    0,
  );
  // 8. Verify comment metrics (new community has 0 comments)
  TestValidator.equals(
    "comments_total is 0 for new community",
    analytics.comments_total,
    0,
  );
  TestValidator.equals(
    "comments_avg_score is 0 for no comments",
    analytics.comments_avg_score,
    0,
  );
  // 9. Verify moderator count (owner is auto-assigned as moderator)
  TestValidator.equals(
    "moderators_count is 1 (owner only)",
    analytics.moderators_count,
    1,
  );
}
