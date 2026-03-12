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
 * Test that analytics endpoint handles a newly created community with zero activity correctly.
 * The test creates an empty community and validates that all analytics fields return appropriate
 * zero values instead of null, with subscriber_count and moderators_count being 1 (the owner).
 */
export async function test_api_community_analytics_empty_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register and login
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Member setup - register and login (will be community owner)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 3. Create a new empty community as member
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 4. Call analytics endpoint using admin connection
  const analytics =
    await api.functional.redditClone.admin.communities.analytics(
      adminConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(analytics);
  // 5. Validate community identity matches
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
  // 6. Validate subscriber_count is 1 (owner auto-subscribed)
  TestValidator.equals(
    "subscriber_count is 1 (owner)",
    analytics.subscriber_count,
    1,
  );
  // 7. Validate moderators_count is 1 (owner auto-moderator)
  TestValidator.equals(
    "moderators_count is 1 (owner)",
    analytics.moderators_count,
    1,
  );
  // 8. Validate all subscriber growth fields are 0
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
  // 9. Validate all post count fields are 0
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
  // 10. Validate posts_avg_score is 0 (not null)
  TestValidator.equals("posts_avg_score is 0", analytics.posts_avg_score, 0);
  // 11. Validate comments_total is 0
  TestValidator.equals("comments_total is 0", analytics.comments_total, 0);
  // 12. Validate comments_avg_score is 0 (not null)
  TestValidator.equals(
    "comments_avg_score is 0",
    analytics.comments_avg_score,
    0,
  );
}
