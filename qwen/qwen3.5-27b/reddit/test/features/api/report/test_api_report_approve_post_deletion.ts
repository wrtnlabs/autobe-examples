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
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_reports_create } from "../../../generate/generate_random_reddit_clone_member_reports_create";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_report } from "../../../prepare/prepare_random_reddit_clone_report";

/**
 * Test the primary success path for approving a report that targets a post.
 *
 * Validates the complete report approval workflow including moderator authentication, post creation by a member, report submission, and moderator approval action. Ensures that when a moderator approves a report, the reported post is permanently deleted and the report status is updated to 'approved'.
 *
 * Special attention is given to verifying that the report status transitions correctly from 'pending' to 'approved', and that the reported content is completely removed from the system through a hard delete operation.
 *
 * 1. Moderator registers and authenticates with email, password, and display name.
 * 2. Member registers and authenticates with email, password, and unique username.
 * 3. Member creates a text post in a community (must be subscribed).
 * 4. Member submits a report on the post with a violation reason.
 * 5. Moderator approves the report using the report ID.
 * 6. Validates that the report status is 'approved' and the post is deleted.
 */
export async function test_api_report_approve_post_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator setup
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Member setup
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Create a post
  const post: IRedditClonePost =
    await generate_random_reddit_clone_member_posts_create(memberConnection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      },
    });
  typia.assert(post);
  // 4. Create a report on the post
  const report: IRedditCloneReport =
    await generate_random_reddit_clone_member_reports_create(memberConnection, {
      body: {
        report_type: "post",
        post_id: post.id,
        reason: "This post violates community guidelines - spam content",
      },
    });
  typia.assert(report);
  // Validate initial report status is 'pending'
  TestValidator.equals("initial report status", report.status, "pending");
  // 5. Moderator approves the report
  const approvedReport: IRedditCloneReport =
    await api.functional.redditClone.moderator.reports.approve(
      moderatorConnection,
      {
        reportId: report.id,
      },
    );
  typia.assert(approvedReport);
  // 6. Validate report status changed to 'approved'
  TestValidator.equals(
    "report status after approval",
    approvedReport.status,
    "approved",
  );
  // 7. Validate the reported post is deleted (reportedPost should be null after approval)
  TestValidator.equals(
    "reported post is deleted",
    approvedReport.reportedPost,
    null,
  );
  // 8. Validate updated_at timestamp is set
  TestValidator.predicate(
    "updated_at is set",
    approvedReport.updated_at !== null,
  );
  // 9. Validate the report still contains the reason
  TestValidator.equals(
    "reason preserved",
    approvedReport.reason,
    report.reason,
  );
  // 10. Validate the reporter information is preserved
  TestValidator.equals(
    "reporter preserved",
    approvedReport.reporter.id,
    report.reporter.id,
  );
}
