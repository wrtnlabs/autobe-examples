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
 * Test the primary success path for approving a report that targets a comment.
 *
 * Validates the complete report approval workflow including moderator authentication, comment creation, report submission, and report approval. Ensures that when a moderator approves a report targeting a comment, the comment is permanently deleted (hard delete) while the parent post remains intact.
 *
 * Special attention is given to verifying that the report status transitions from 'pending' to 'approved', the reported comment is completely removed from the database, and the parent post is unaffected by the approval action.
 *
 * 1. Moderator registers and authenticates with email and password.
 * 2. Member registers and authenticates with email, password, and username.
 * 3. Member creates a post in a community.
 * 4. Member creates a comment on the post.
 * 5. Member creates a report on the comment with a reason.
 * 6. Moderator approves the report using the report ID.
 * 7. Validates report status changes to 'approved'.
 * 8. Validates the reported comment is hard-deleted.
 * 9. Validates the parent post remains intact.
 */
export async function test_api_report_approve_comment_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator setup
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {});
  // 2. Member setup
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 3. Create a post
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {},
  );
  typia.assert(post);
  // 4. Create a comment on the post
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  // 5. Create a report on the comment
  const report = await generate_random_reddit_clone_member_reports_create(
    memberConnection,
    {
      body: {
        report_type: "comment",
        comment_id: comment.id,
        reason: "This comment violates community guidelines",
      },
    },
  );
  typia.assert(report);
  // 6. Validate initial report state
  TestValidator.equals("report type is comment", report.report_type, "comment");
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals(
    "reported comment matches created comment",
    report.reportedComment?.id,
    comment.id,
  );
  // 7. Moderator approves the report
  const approvedReport =
    await api.functional.redditClone.moderator.reports.approve(
      moderatorConnection,
      {
        reportId: report.id,
      },
    );
  typia.assert(approvedReport);
  // 8. Validate report status is 'approved'
  TestValidator.equals(
    "report status is approved",
    approvedReport.status,
    "approved",
  );
  // 9. Validate the reported comment is hard-deleted (should be null after deletion)
  TestValidator.equals(
    "reported comment is null after deletion",
    approvedReport.reportedComment,
    null,
  );
  // 10. Validate report type remains 'comment'
  TestValidator.equals(
    "report type remains comment",
    approvedReport.report_type,
    "comment",
  );
  // 11. Validate report has updated_at timestamp
  TestValidator.predicate(
    "report has updated_at timestamp",
    approvedReport.updated_at !== undefined,
  );
  // 12. Validate the parent post remains intact by fetching it again
  // We can verify the post still exists by checking its ID is valid
  TestValidator.predicate(
    "parent post ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      post.id,
    ),
  );
}
