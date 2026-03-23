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
 * Test that a community owner can successfully retrieve analytics for their own community.
 *
 * 1. Register and authenticate as a member (owner)
 * 2. Create a new community as the authenticated member
 * 3. Retrieve analytics for the created community
 * 4. Validate analytics response structure and content
 */
export async function test_api_community_analytics_owner_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as member (owner)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a new community as the authenticated member
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Retrieve analytics for the created community
  const analytics =
    await api.functional.redditClone.member.communities.analytics(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(analytics);
  // 4. Validate analytics response
  TestValidator.equals("community id matches", analytics.id, community.id);
  TestValidator.equals(
    "community name matches",
    analytics.name,
    community.name,
  );
  TestValidator.predicate(
    "subscriber count at least 1",
    analytics.subscriber_count >= 1,
  );
  TestValidator.predicate(
    "moderators count at least 1",
    analytics.moderators_count >= 1,
  );
  TestValidator.predicate(
    "posts total is non-negative",
    analytics.posts_total >= 0,
  );
  TestValidator.predicate(
    "comments total is non-negative",
    analytics.comments_total >= 0,
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
}
