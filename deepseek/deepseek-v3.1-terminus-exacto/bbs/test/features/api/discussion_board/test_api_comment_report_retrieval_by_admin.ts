import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentReport";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the successful retrieval of a comment report by an administrator.
 * Validates that an admin can access a specific comment report within the proper
 * hierarchical context (article → comment → report). Verifies that the response
 * includes complete report details including reporter information, report reason,
 * status, and the reported comment summary.
 */
export async function test_api_comment_report_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Note: Since the available API functions only include admin join and report retrieval,
  // and no utility functions exist for creating articles, comments, or reports,
  // this test focuses on validating the report retrieval endpoint structure and
  // response format using generated UUIDs. In a complete implementation, we would
  // create actual entities first, but the necessary creation endpoints are not
  // available in the provided SDK functions.
  // Generate hierarchical IDs for the test
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the comment report
  const report =
    await api.functional.discussionBoard.admin.articles.comments.reports.at(
      adminConnection,
      {
        articleId,
        commentId,
        reportId,
      },
    );
  typia.assert(report);
  // Validate report structure
  TestValidator.equals("report ID matches", report.id, reportId);
  TestValidator.predicate("report reason exists", report.reason.length > 0);
  TestValidator.predicate(
    "report status is valid",
    ["pending", "under_review", "resolved"].includes(report.status),
  );
  TestValidator.predicate("reporter exists", report.reporter.id.length > 0);
  TestValidator.predicate(
    "reporter display name exists",
    report.reporter.display_name.length > 0,
  );
  TestValidator.predicate(
    "reported comment exists",
    report.reportedComment.id.length > 0,
  );
  TestValidator.equals(
    "reported comment ID matches",
    report.reportedComment.id,
    commentId,
  );
  TestValidator.predicate(
    "comment content exists",
    report.reportedComment.content.length > 0,
  );
  TestValidator.predicate(
    "comment author exists",
    report.reportedComment.author.id.length > 0,
  );
  TestValidator.predicate(
    "comment author display name exists",
    report.reportedComment.author.display_name.length > 0,
  );
  TestValidator.predicate(
    "created at timestamp exists",
    report.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated at timestamp exists",
    report.updated_at.length > 0,
  );
}
