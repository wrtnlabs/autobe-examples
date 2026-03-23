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
 * Test community metrics endpoint with an empty community (no posts, comments, or activity).
 * Validates that all metric fields are correctly returned with zero/null values.
 */
export async function test_api_community_metrics_empty_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 3. Create a new community with no activity
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 4. Retrieve metrics for the empty community
  const metrics = await api.functional.redditClone.admin.communities.metrics(
    adminConnection,
    {
      communityId: community.id,
    },
  );
  typia.assert(metrics);
  // 5. Validate community identification fields
  TestValidator.equals(
    "community_id matches",
    metrics.community_id,
    community.id,
  );
  TestValidator.equals(
    "community_name matches",
    metrics.community_name,
    community.name,
  );
  TestValidator.equals(
    "subscriber_count is 1 (owner)",
    metrics.subscriber_count,
    1,
  );
  TestValidator.predicate("created_at is valid", metrics.created_at !== null);
  // 6. Validate post metrics (all zero/null for empty community)
  TestValidator.equals("total_posts is 0", metrics.total_posts, 0);
  TestValidator.equals(
    "posts_by_type.text is 0",
    metrics.posts_by_type.text,
    0,
  );
  TestValidator.equals(
    "posts_by_type.link is 0",
    metrics.posts_by_type.link,
    0,
  );
  TestValidator.equals(
    "posts_by_type.image is 0",
    metrics.posts_by_type.image,
    0,
  );
  TestValidator.equals("avg_post_score is null", metrics.avg_post_score, null);
  TestValidator.equals(
    "most_recent_post_at is null",
    metrics.most_recent_post_at,
    null,
  );
  // 7. Validate comment metrics (all zero/null for empty community)
  TestValidator.equals("total_comments is 0", metrics.total_comments, 0);
  TestValidator.equals(
    "avg_comment_score is null",
    metrics.avg_comment_score,
    null,
  );
  TestValidator.equals(
    "most_recent_comment_at is null",
    metrics.most_recent_comment_at,
    null,
  );
  // 8. Validate moderator metrics (only owner exists)
  TestValidator.equals("total_moderators is 1", metrics.total_moderators, 1);
  TestValidator.equals(
    "moderators_by_role.owner is 1",
    metrics.moderators_by_role.owner,
    1,
  );
  TestValidator.equals(
    "moderators_by_role.mod is 0",
    metrics.moderators_by_role.mod,
    0,
  );
  // 9. Validate ban metrics (no bans)
  TestValidator.equals("active_bans is 0", metrics.active_bans, 0);
  // 10. Validate derived metrics
  TestValidator.equals("total_engagement is 0", metrics.total_engagement, 0);
  TestValidator.equals("activity_score is null", metrics.activity_score, null);
}
