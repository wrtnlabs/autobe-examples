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
import { generate_random_reddit_like_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_community_member_posts_comments_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { generate_random_reddit_like_community_member_reports_create } from "../../../generate/generate_random_reddit_like_community_member_reports_create";
import { generate_random_reddit_like_community_member_reports_report_on_comments_create } from "../../../generate/generate_random_reddit_like_community_member_reports_report_on_comments_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";
import { prepare_random_reddit_like_community_post_comment } from "../../../prepare/prepare_random_reddit_like_community_post_comment";
import { prepare_random_reddit_like_community_report } from "../../../prepare/prepare_random_reddit_like_community_report";
import { prepare_random_reddit_like_community_report_on_comment } from "../../../prepare/prepare_random_reddit_like_community_report_on_comment";

/**
 * Test viewing a pending report-on-comment junction record as a moderator.
 *
 * Validates the complete reporting workflow where a moderator can review a pending report targeting a comment. Tests the GET endpoint for retrieving the report-on-comment junction record with full context including report metadata, reporter identity, and reported comment details.
 *
 * The test ensures that community owners (who have moderator authority) can access report junction records for moderation review purposes. The pending status indicates the report has not yet been resolved.
 *
 * 1. Moderator member registers and authenticates to the platform.
 * 2. Moderator creates a community, becoming its owner with moderator privileges.
 * 3. A separate commenter member registers and subscribes to the community.
 * 4. Commenter creates a post and writes a comment that will be reported.
 * 5. A reporter member registers and creates a report targeting the comment.
 * 6. The report is linked to the comment via the report-on-comments junction.
 * 7. Moderator retrieves the report-on-comment junction record using the GET endpoint.
 * 8. Validates the junction record contains pending status, report reason, reporter info, and comment content.
 */
export async function test_api_report_on_comment_pending_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate moderator (community owner)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(16);
  await authorize_member_join(moderatorConnection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: RandomGenerator.name(1),
    },
  });
  // 2. Create community (moderator becomes owner with moderator privileges)
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      moderatorConnection,
      {},
    );
  typia.assert(community);
  // 3. Register and authenticate commenter
  const commenterConnection: api.IConnection = { host: connection.host };
  const commenterEmail = typia.random<string & tags.Format<"email">>();
  const commenterPassword = RandomGenerator.alphaNumeric(16);
  await authorize_member_join(commenterConnection, {
    body: {
      email: commenterEmail,
      password: commenterPassword,
      username: RandomGenerator.name(1),
    },
  });
  // 4. Subscribe commenter to the community
  await generate_random_reddit_like_community_member_community_subscriptions_create(
    commenterConnection,
    { body: { community_id: community.id } },
  );
  // 5. Create a post by commenter
  const post = await generate_random_reddit_like_community_member_posts_create(
    commenterConnection,
    { body: { community_id: community.id } },
  );
  typia.assert(post);
  // 6. Create a comment on the post
  const comment =
    await generate_random_reddit_like_community_member_posts_comments_create(
      commenterConnection,
      { params: { postId: post.id } },
    );
  typia.assert(comment);
  // 7. Register and authenticate reporter
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reporterPassword = RandomGenerator.alphaNumeric(16);
  await authorize_member_join(reporterConnection, {
    body: {
      email: reporterEmail,
      password: reporterPassword,
      username: RandomGenerator.name(1),
    },
  });
  // 8. Create a report targeting the comment
  const report =
    await generate_random_reddit_like_community_member_reports_create(
      reporterConnection,
      {
        body: {
          commentId: comment.id,
          reason: "Inappropriate content in comment",
        },
      },
    );
  typia.assert(report);
  // 9. Link the report to the comment via report-on-comments junction
  const reportOnComment =
    await generate_random_reddit_like_community_member_reports_report_on_comments_create(
      reporterConnection,
      { params: { reportId: report.id } },
    );
  typia.assert(reportOnComment);
  // 10. Moderator retrieves the report-on-comment junction record
  const result =
    await api.functional.redditLikeCommunity.reports.report_on_comments.getByReportidAndReportoncommentid(
      moderatorConnection,
      {
        reportId: report.id,
        reportOnCommentId: reportOnComment.id,
      },
    );
  typia.assert(result);
  // 11. Validate the junction record
  TestValidator.equals("junction ID matches", result.id, reportOnComment.id);
  TestValidator.equals(
    "report status is pending",
    result.report.status,
    "pending",
  );
  TestValidator.equals(
    "report reason matches",
    result.report.reason,
    "Inappropriate content in comment",
  );
  TestValidator.equals(
    "comment content matches created comment",
    result.comment.content,
    comment.body,
  );
  TestValidator.predicate(
    "has valid created_at timestamp",
    result.created_at !== undefined,
  );
  TestValidator.equals(
    "deleted_at is null for active junction",
    result.deleted_at,
    null,
  );
}
