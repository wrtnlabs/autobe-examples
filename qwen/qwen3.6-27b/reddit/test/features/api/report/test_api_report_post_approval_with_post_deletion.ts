import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IREdditLikeCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReport";
import type { IREdditLikeCommunityReportOnComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReportOnComment";
import type { IREdditLikeCommunityReportOnPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReportOnPost";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { generate_random_reddit_like_community_member_reports_create } from "../../../generate/generate_random_reddit_like_community_member_reports_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";
import { prepare_random_reddit_like_community_report } from "../../../prepare/prepare_random_reddit_like_community_report";

/**
 * Test moderator approval of a post report and verify post deletion.
 *
 * Validates the complete report lifecycle where a community moderator approves a pending report targeting a post. The scenario verifies that the report transitions from pending to approved status with proper resolution metadata populated.
 *
 * Special attention is given to confirming that the resolved_by and resolved_at fields are correctly populated upon approval, documenting which moderator acted and when. Due to SDK limitations, the post soft-deletion cannot be directly verified through available read endpoints.
 *
 * 1. Moderator registers and creates a community.
 * 2. Moderator subscribes to their community and creates a post.
 * 3. Moderator creates a report targeting the post with pending status.
 * 4. Moderator approves the report and validates resolution metadata.
 */
export async function test_api_report_post_approval_with_post_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator setup - join and create community
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(1),
    },
  });
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      moderatorConnection,
      {},
    );
  typia.assert(community);
  // 2. Subscribe moderator to community and create post
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    moderatorConnection,
    { body: { community_id: community.id } },
  );
  const post = await generate_random_reddit_like_community_member_posts_create(
    moderatorConnection,
    { body: { community_id: community.id } },
  );
  typia.assert(post);
  // 3. Create a report targeting the post (status will be 'pending')
  const report =
    await generate_random_reddit_like_community_member_reports_create(
      moderatorConnection,
      {
        body: {
          postId: post.id,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(report);
  // Verify report is in pending state
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals(
    "report target type is post",
    report.target_type,
    "post",
  );
  // 4. Moderator approves the report
  const updateBody = {
    status: "approved",
  } satisfies IREdditLikeCommunityReport.IUpdate;
  const updatedReport =
    await api.functional.redditLikeCommunity.reports.report_on_posts.update(
      moderatorConnection,
      {
        reportId: report.id,
        body: updateBody,
      },
    );
  typia.assert(updatedReport);
  // 5. Validate report resolution
  TestValidator.equals(
    "report status transitioned to approved",
    updatedReport.status,
    "approved",
  );
  TestValidator.predicate(
    "resolved_by is populated",
    updatedReport.resolvedBy !== null,
  );
  TestValidator.predicate(
    "resolved_at is populated",
    updatedReport.resolved_at !== null,
  );
  // Verify the junction record links the report to the original post
  typia.assertGuard(updatedReport.onPost!);
  TestValidator.equals(
    "report targets the correct post",
    updatedReport.onPost.post.id,
    post.id,
  );
}
