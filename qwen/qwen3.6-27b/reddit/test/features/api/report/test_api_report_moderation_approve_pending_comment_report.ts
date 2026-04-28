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
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_moderator } from "../../../prepare/prepare_random_reddit_like_community_moderator";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";
import { prepare_random_reddit_like_community_post_comment } from "../../../prepare/prepare_random_reddit_like_community_post_comment";
import { prepare_random_reddit_like_community_report } from "../../../prepare/prepare_random_reddit_like_community_report";
import { prepare_random_reddit_like_community_report_on_comment } from "../../../prepare/prepare_random_reddit_like_community_report_on_comment";

/**
 * Test moderator approval of a pending comment report resulting in comment soft-deletion.
 *
 * Validates the complete moderation workflow for comment reports including community setup, content creation, report filing, and moderator resolution. When a moderator approves a pending comment report, the system transitions the report status to approved, records the resolving moderator's identity and timestamp, and soft-deletes the reported comment.
 *
 * Special attention is given to verifying that the report status transitions from pending to approved, the resolved_by_member_id is populated with the moderator's ID, and the resolved_at timestamp is set upon resolution.
 *
 * 1. Member registers and authenticates on the platform.
 * 2. Member creates a community and becomes its creator.
 * 3. Member is assigned as a moderator of the community.
 * 4. Member subscribes to the community to enable content creation.
 * 5. Member creates a text post in the subscribed community.
 * 6. Member writes a comment on the post.
 * 7. Member creates a report targeting the comment with a reason.
 * 8. Report-on-comments junction is established linking the report to the comment.
 * 9. Moderator approves the pending report via PUT on the junction endpoint.
 * 10. Validates report status is approved, resolved_by is set, and resolved_at is populated.
 */
export async function test_api_report_moderation_approve_pending_comment_report(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // 2. Create community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Assign member as moderator of the community
  await generate_random_reddit_like_community_member_moderators_create(
    memberConnection,
    {
      body: {
        member_id: member.id,
        community_id: community.id,
      },
    },
  );
  // 4. Subscribe member to the community
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    memberConnection,
    { body: { community_id: community.id } },
  );
  // 5. Create text post in community
  const post = await generate_random_reddit_like_community_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
      },
    },
  );
  typia.assert(post);
  // 6. Create comment on the post
  const comment =
    await generate_random_reddit_like_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {},
      },
    );
  typia.assert(comment);
  // 7. Create report targeting the comment with reason
  const report =
    await generate_random_reddit_like_community_member_reports_create(
      memberConnection,
      {
        body: {
          commentId: comment.id,
          reason: "Rule violation detected",
        },
      },
    );
  typia.assert(report);
  // 8. Extract report-on-comment junction ID (auto-created with the report)
  const reportOnComment = typia.assert<IREdditLikeCommunityReportOnComment>(report.reportOnComment!);
  const reportOnCommentId: string = reportOnComment.id;
  // 9. Moderator approves the pending comment report
  const updatedReport =
    await api.functional.redditLikeCommunity.member.reports.report_on_comments.update(
      memberConnection,
      {
        reportId: report.id,
        reportOnCommentId,
        body: {
          status: "approved",
        } satisfies IREdditLikeCommunityReport.IUpdate,
      },
    );
  typia.assert(updatedReport);
  // 10. Validate resolution metadata
  TestValidator.equals(
    "report status is approved",
    updatedReport.status,
    "approved",
  );
  TestValidator.predicate(
    "resolved_by is set",
    updatedReport.resolvedBy !== null,
  );
  TestValidator.predicate(
    "resolved_at is populated",
    updatedReport.resolved_at !== null,
  );
  const resolvedByMemberId: string = updatedReport.resolvedBy!.id;
  TestValidator.equals(
    "resolved_by is the moderator",
    resolvedByMemberId,
    member.id,
  );
}
