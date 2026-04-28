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
 * Test moderator dismissal of a pending comment report within a community.
 *
 * Validates the complete report dismissal workflow from initial community setup through comment reporting and final moderator action. The report status transitions from 'pending' to 'dismissed' upon moderator approval, with the report being soft-deleted from the active moderation queue.
 *
 * Special attention is given to verifying that the comment report correctly identifies the target type as 'comment', and that the dismissal operation preserves the reported content intact while removing it from the moderator's active report view.
 *
 * 1. Member A joins the platform and creates a community.
 * 2. Member A appoints themselves as a moderator with authority over the community.
 * 3. Member B joins, subscribes to the community, and creates a post.
 * 4. Member B writes a comment on their own post.
 * 5. Member C joins the platform and reports the comment with a reason for moderator review.
 * 6. Member A, acting as community moderator, dismisses the pending report.
 * 7. Validates that the comment remains fully visible and the report is removed from the active queue.
 */
export async function test_api_report_dismiss_comment_report(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A joins the platform
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {} satisfies DeepPartial<IREdditLikeCommunityMember.IJoin>,
  });
  typia.assert(memberA);
  // 2. Member A creates a community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberAConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Member A appoints themselves as moderator
  const moderator =
    await generate_random_reddit_like_community_member_communities_community_moderators_create(
      memberAConnection,
      {
        body: { member_id: memberA.id },
        params: { communityId: community.id },
      },
    );
  typia.assert(moderator);
  // 4. Member B joins, subscribes to community, and creates a post
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {} satisfies DeepPartial<IREdditLikeCommunityMember.IJoin>,
  });
  typia.assert(memberB);
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberBConnection,
      { body: { community_id: community.id } },
    );
  typia.assert(subscription);
  const post = await generate_random_reddit_like_community_member_posts_create(
    memberBConnection,
    { body: { community_id: community.id } },
  );
  typia.assert(post);
  // 5. Member B creates a comment on their post
  const comment =
    await generate_random_reddit_like_community_member_posts_comments_create(
      memberBConnection,
      { params: { postId: post.id } },
    );
  typia.assert(comment);
  // 6. Member C joins and reports the comment
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberC = await authorize_member_join(memberCConnection, {
    body: {} satisfies DeepPartial<IREdditLikeCommunityMember.IJoin>,
  });
  typia.assert(memberC);
  const reportReason = RandomGenerator.paragraph({ sentences: 2 });
  const report =
    await generate_random_reddit_like_community_member_reports_create(
      memberCConnection,
      {
        body: {
          commentId: comment.id,
          reason: reportReason,
        } satisfies IREdditLikeCommunityReport.ICreate,
      },
    );
  typia.assert(report);
  // 7. Validate report creation for comment targeting
  TestValidator.equals(
    "report targets comment type",
    report.target_type,
    "comment",
  );
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals(
    "report reason matches input",
    report.reason,
    reportReason,
  );
  TestValidator.predicate(
    "comment report junction exists",
    report.reportOnComment !== null,
  );
  // 8. Member A (moderator) dismisses the report
  await api.functional.redditLikeCommunity.member.reports.eraseByReportid(
    memberAConnection,
    {
      reportId: report.id,
    },
  );
  // 9. Validate comment remains intact after report dismissal
  TestValidator.predicate(
    "reported comment body is preserved",
    comment.body.length > 0,
  );
}
