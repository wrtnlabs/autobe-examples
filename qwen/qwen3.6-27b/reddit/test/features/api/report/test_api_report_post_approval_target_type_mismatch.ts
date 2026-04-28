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
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeCommunityPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostComment";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_community_moderators_create } from "../../../generate/generate_random_reddit_like_community_member_communities_community_moderators_create";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { generate_random_reddit_like_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_community_member_posts_comments_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { generate_random_reddit_like_community_member_reports_create } from "../../../generate/generate_random_reddit_like_community_member_reports_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_moderator } from "../../../prepare/prepare_random_reddit_like_community_moderator";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";
import { prepare_random_reddit_like_community_post_comment } from "../../../prepare/prepare_random_reddit_like_community_post_comment";
import { prepare_random_reddit_like_community_report } from "../../../prepare/prepare_random_reddit_like_community_report";

/**
 * Validates that a moderator cannot approve a comment-targeted report using the post approval endpoint.
 *
 * The post approval endpoint (POST /reports/{reportId}/report-on-posts) expects reports with target_type='post'. This test verifies the system correctly rejects the operation when a report targets a comment instead. The target_type discriminator mismatch should cause the endpoint to fail.
 *
 * 1. Create the community owner account and authenticate.
 * 2. Owner creates a community and automatically becomes the community owner.
 * 3. Create a reporter account and authenticate.
 * 4. Reporter subscribes to the community.
 * 5. Reporter creates a post in the community.
 * 6. Reporter creates a comment on the post.
 * 7. Reporter submits a report targeting the comment (target_type='comment').
 * 8. Owner attempts to approve the comment-targeted report via the post approval endpoint.
 * 9. The system rejects the operation due to target_type discriminator mismatch.
 */
export async function test_api_report_post_approval_target_type_mismatch(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, { body: {} });
  // 2. Create community (owner auto-becomes creator)
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Create reporter account
  const reporterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(reporterConnection, { body: {} });
  // 4. Reporter subscribes to community
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      reporterConnection,
      { body: { community_id: community.id } },
    );
  typia.assert(subscription);
  // 5. Reporter creates a post
  const post = await generate_random_reddit_like_community_member_posts_create(
    reporterConnection,
    { body: { community_id: community.id } },
  );
  typia.assert(post);
  // 6. Reporter creates a comment on the post
  const comment =
    await generate_random_reddit_like_community_member_posts_comments_create(
      reporterConnection,
      { params: { postId: post.id } },
    );
  typia.assert(comment);
  // 7. Reporter creates a report targeting the comment
  const report =
    await generate_random_reddit_like_community_member_reports_create(
      reporterConnection,
      {
        body: {
          commentId: comment.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(report);
  TestValidator.equals("report targets comment", report.target_type, "comment");
  // 8-9. Owner attempts post approval on comment-targeted report - should fail
  await TestValidator.error(
    "comment-targeted report rejected on post approval endpoint",
    async () => {
      await api.functional.redditLikeCommunity.member.reports.report_on_posts.approveOnPost(
        ownerConnection,
        { reportId: report.id },
      );
    },
  );
}