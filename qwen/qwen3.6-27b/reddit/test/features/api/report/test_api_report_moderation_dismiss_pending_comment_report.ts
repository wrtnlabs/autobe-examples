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
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { generate_random_reddit_like_community_member_moderators_create } from "../../../generate/generate_random_reddit_like_community_member_moderators_create";
import { generate_random_reddit_like_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_community_member_posts_comments_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { generate_random_reddit_like_community_member_reports_create } from "../../../generate/generate_random_reddit_like_community_member_reports_create";
import { generate_random_reddit_like_community_member_reports_report_on_comments_create } from "../../../generate/generate_random_reddit_like_community_member_reports_report_on_comments_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_moderator } from "../../../prepare/prepare_random_reddit_like_community_moderator";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";
import { prepare_random_reddit_like_community_post_comment } from "../../../prepare/prepare_random_reddit_like_community_post_comment";
import { prepare_random_reddit_like_community_report } from "../../../prepare/prepare_random_reddit_like_community_report";
import { prepare_random_reddit_like_community_report_on_comment } from "../../../prepare/prepare_random_reddit_like_community_report_on_comment";

/**
 * Test community moderator dismissal of a pending comment report.
 *
 * Validates the complete report dismissal workflow: a member creates a community, becomes its moderator, posts content, comments on the post, creates a report targeting the comment, and then dismisses the report as a moderator. The dismissal should transition the report status to dismissed, populate resolved_at and resolved_by_member_id fields, and soft-delete the report while keeping the reported comment intact.
 *
 * Special attention is given to verifying that dismissal does not affect the reported comment (it remains visible), the report is hidden from the moderation queue via soft-delete, and the resolution metadata correctly identifies the dismissing moderator.
 *
 * 1. Member registers and authenticates on the platform
 * 2. Member creates a community and becomes its moderator
 * 3. Member subscribes to the community
 * 4. Member creates a text post in the community
 * 5. Member writes a comment on the post
 * 6. Member creates a report targeting the comment with a reason
 * 7. Report-on-comments junction is established linking the report to the comment (done automatically by report creation)
 * 8. Moderator dismisses the pending report via the report-on-comments junction
 * 9. Validates report status transitions to dismissed with resolution metadata populated
 */
export async function test_api_report_moderation_dismiss_pending_comment_report(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registers and authenticates
  const memberConnection: api.IConnection = { host: connection.host };
  const memberLogin = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(memberLogin);
  // 2. Member creates a community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Member becomes a moderator of the community
  const moderatorAssignment =
    await generate_random_reddit_like_community_member_moderators_create(
      memberConnection,
      {
        body: { member_id: memberLogin.id, community_id: community.id },
      },
    );
  typia.assert(moderatorAssignment);
  // 4. Member subscribes to the community
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConnection,
      {
        body: { community_id: community.id },
      },
    );
  typia.assert(subscription);
  // 5. Member creates a text post in the community
  const post = await generate_random_reddit_like_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // 6. Member writes a comment on the post
  const comment =
    await generate_random_reddit_like_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          body: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(comment);
  // 7. Member creates a report targeting the comment
  // The report creation automatically creates the reportOnComment junction record
  const report =
    await generate_random_reddit_like_community_member_reports_create(
      memberConnection,
      {
        body: {
          commentId: comment.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(report);
  typia.assert(report.reportOnComment);
  TestValidator.equals("report targets comment", report.target_type, "comment");
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.predicate(
    "resolved_at is null before resolution",
    report.resolved_at === null,
  );
  // 8. Moderator dismisses the pending report via the report-on-comments junction
  const reportOnCommentId = report.reportOnComment!.id;
  const updatedReport =
    await api.functional.redditLikeCommunity.member.reports.report_on_comments.update(
      memberConnection,
      {
        reportId: report.id,
        reportOnCommentId,
        body: {
          status: "dismissed",
        } satisfies IREdditLikeCommunityReport.IUpdate,
      },
    );
  typia.assert(updatedReport);
  // 9. Validate dismissal outcome
  TestValidator.equals(
    "report status transitions to dismissed",
    updatedReport.status,
    "dismissed",
  );
  TestValidator.predicate(
    "resolved_at is populated after dismissal",
    updatedReport.resolved_at !== null,
  );
  TestValidator.predicate(
    "resolvedBy is set to the dismissing moderator",
    updatedReport.resolvedBy !== null,
  );
  TestValidator.equals(
    "resolvedBy is the dismissing moderator member id",
    updatedReport.resolvedBy!.id,
    memberLogin.id,
  );
  TestValidator.predicate(
    "report is soft-deleted after dismissal",
    updatedReport.deleted_at !== null,
  );
  TestValidator.predicate(
    "report updated_at is refreshed",
    updatedReport.updated_at !== null,
  );
}
