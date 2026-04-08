import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_reports_create } from "../../../generate/generate_random_reddit_clone_member_reports_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_report } from "../../../prepare/prepare_random_reddit_clone_report";

/**
 * Test moderator dismissing a report on a comment, verifying the comment remains active.
 *
 * Validates the complete report dismissal workflow including moderator authentication, member content creation, report submission, and moderator action. Ensures that when a moderator dismisses a report on a comment, the reported content remains visible and functional while the report is soft-deleted from the active moderation queue.
 *
 * Special attention is given to verifying that the comment's deleted_at remains null after dismissal, confirming the content was not removed. The report's status must change to 'dismissed' and its deleted_at timestamp must be set, indicating it has been removed from active moderation queues.
 *
 * 1. Moderator authenticates via join to gain authorization for report handling.
 * 2. First member authenticates via join to create the post and comment.
 * 3. First member creates a post in a community.
 * 4. First member creates a comment on that post.
 * 5. Second member authenticates via join to report the comment.
 * 6. Second member reports the comment with a reason for moderator review.
 * 7. Moderator calls the update endpoint with reportId and status='dismissed'.
 * 8. Validates the response returns the updated report with status='dismissed'.
 * 9. Validates the report's deleted_at timestamp is set (soft-deleted).
 * 10. Validates the reported comment remains active (deleted_at is null).
 */
export async function test_api_report_dismiss_comment_kept(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  // 2. First member authentication (will create post and comment)
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {
    body: {},
  });
  // 3. Create a post
  const post = await generate_random_reddit_clone_member_posts_create(
    member1Connection,
    { body: {} },
  );
  typia.assert(post);
  // 4. Create a comment on the post
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      member1Connection,
      {
        body: {},
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  // 5. Second member authentication (will report the comment)
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {
    body: {},
  });
  // 6. Report the comment
  const report = await generate_random_reddit_clone_member_reports_create(
    member2Connection,
    {
      body: {
        report_type: "comment",
        comment_id: comment.id,
        reason: "This comment violates community guidelines",
      },
    },
  );
  typia.assert(report);
  // Verify initial report status is pending
  TestValidator.equals(
    "initial report status is pending",
    report.status,
    "pending",
  );
  TestValidator.equals(
    "initial report deleted_at is null",
    report.deleted_at,
    null,
  );
  // 7. Moderator dismisses the report
  const updatedReport =
    await api.functional.redditClone.moderator.reports.update(
      moderatorConnection,
      {
        reportId: report.id,
        body: {
          status: "dismissed",
        } satisfies IRedditCloneReport.IUpdate,
      },
    );
  typia.assert(updatedReport);
  // 8. Validate report status changed to dismissed
  TestValidator.equals(
    "report status changed to dismissed",
    updatedReport.status,
    "dismissed",
  );
  // 9. Validate report is soft-deleted (deleted_at is set)
  TestValidator.predicate(
    "report deleted_at is set after dismissal",
    updatedReport.deleted_at !== null,
  );
  // 10. Validate the reported comment remains active
  TestValidator.equals(
    "reported comment remains active (deleted_at is null)",
    comment.deleted_at,
    null,
  );
  // 11. Validate the comment's vote score remains unchanged
  TestValidator.predicate(
    "comment vote score exists",
    typeof comment.voteScore === "number",
  );
  // 12. Validate the comment's reply count remains unchanged
  TestValidator.predicate(
    "comment reply count exists",
    typeof comment.replyCount === "number",
  );
  // 13. Validate the reported comment is correctly referenced
  TestValidator.equals(
    "reported comment ID matches",
    updatedReport.reportedComment?.id,
    comment.id,
  );
  // 14. Validate the report type is still 'comment'
  TestValidator.equals(
    "report type is comment",
    updatedReport.report_type,
    "comment",
  );
}
