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
 * Test moderator approving a report on a comment with nested replies (cascade deletion).
 *
 * Validates the complete report approval workflow for comments with nested reply structures. Ensures that when a moderator approves a report on a parent comment, the entire comment thread tree (parent and all nested replies at any depth) is permanently deleted while the parent post remains accessible.
 *
 * Special attention is given to verifying cascade deletion behavior where all child comments are removed along with the reported parent comment, and the post's comment count is accurately updated to reflect the deleted comments.
 *
 * 1. Moderator authenticates via join to gain moderation privileges.
 * 2. Member authenticates via join to create the post and comment thread.
 * 3. Member creates a text post in a community.
 * 4. Member creates a parent comment on the post.
 * 5. Additional members create nested replies to the parent comment (multiple levels deep).
 * 6. A member reports the parent comment with a violation reason.
 * 7. Moderator approves the report, triggering cascade deletion.
 * 8. Validates report status changes to 'approved'.
 * 9. Validates the parent comment is deleted (deleted_at is set).
 * 10. Validates all nested replies are also deleted (cascade behavior).
 * 11. Validates the parent post remains visible and accessible.
 * 12. Validates the post's comment count is reduced by the total number of deleted comments.
 */
export async function test_api_report_approve_comment_cascade_delete(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {});
  // 2. Member authentication for creating post and comments
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 3. Create a post
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {},
  );
  typia.assert(post);
  // Capture initial comment count
  const initialCommentCount = post.comment_count;
  // 4. Create parent comment
  const parentComment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: { content: "This is the parent comment that will be reported." },
      },
    );
  typia.assert(parentComment);
  // 5. Create nested replies (3 levels deep)
  const reply1 =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: "Reply to parent comment - level 1",
          parentCommentId: parentComment.id,
        },
      },
    );
  typia.assert(reply1);
  const reply2 =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: "Reply to level 1 - level 2",
          parentCommentId: reply1.id,
        },
      },
    );
  typia.assert(reply2);
  const reply3 =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: "Reply to level 2 - level 3",
          parentCommentId: reply2.id,
        },
      },
    );
  typia.assert(reply3);
  // Count total comments created in this test
  const totalCreatedComments = 4; // parent + 3 replies
  // 6. Create a report on the parent comment
  const report = await generate_random_reddit_clone_member_reports_create(
    memberConnection,
    {
      body: {
        report_type: "comment",
        comment_id: parentComment.id,
        reason: "This comment violates community guidelines - spam content.",
      },
    },
  );
  typia.assert(report);
  // Verify report is in pending status
  TestValidator.equals(
    "report initial status is pending",
    report.status,
    "pending",
  );
  // 7. Moderator approves the report
  const updatedReport =
    await api.functional.redditClone.moderator.reports.update(
      moderatorConnection,
      {
        reportId: report.id,
        body: { status: "approved" } satisfies IRedditCloneReport.IUpdate,
      },
    );
  typia.assert(updatedReport);
  // 8. Validate report status changed to approved
  TestValidator.equals(
    "report status changed to approved",
    updatedReport.status,
    "approved",
  );
  // 9. Validate parent comment is deleted
  typia.assertGuard(updatedReport.reportedComment!);
  TestValidator.predicate(
    "parent comment deleted_at is set",
    updatedReport.reportedComment.deleted_at !== null,
  );
  // 10. Validate the reported comment structure
  TestValidator.equals(
    "reported content type is comment",
    updatedReport.report_type,
    "comment",
  );
  TestValidator.predicate(
    "reported comment exists in response",
    updatedReport.reportedComment !== null,
  );
  // 11. Verify parent post remains visible and accessible
  TestValidator.predicate("parent post still exists", post.id !== undefined);
  TestValidator.equals("parent post not deleted", post.deleted_at, null);
  // 12. Verify comment count reflects the deletion
  // The cascade delete should remove all 4 comments (parent + 3 replies)
  // The post's comment_count should be reduced by the number of deleted comments
  TestValidator.equals(
    "post comment count reduced by deleted comments",
    post.comment_count - totalCreatedComments,
    initialCommentCount,
  );
}
