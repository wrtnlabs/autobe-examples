import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentReport";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_comments_reports_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_reports_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_comment_report } from "../../../prepare/prepare_random_discussion_board_comment_report";

/**
 * Test partial update of a comment report with resolution details while maintaining existing reason values.
 * A super administrator updates only the resolution_details field to add moderator notes while leaving
 * the report reason unchanged. Verify that partial updates work correctly, only specified fields are
 * modified, unchanged fields preserve their original values, and the updated report reflects partial
 * field modifications correctly.
 */
export async function test_api_superadmin_comment_report_partial_update_resolution(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate using utility function
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  // Create article as user - we need a valid section_id
  // Since we don't have section creation capability, we'll use a random UUID
  // In a real scenario, sections would be created by administrators first
  const article = await api.functional.discussionBoard.user.articles.create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create comment as user
  const comment =
    await api.functional.discussionBoard.user.articles.comments.create(
      userConnection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // Create comment report with specific reason
  const initialReportReason = "Inappropriate content violation";
  const report =
    await api.functional.discussionBoard.user.articles.comments.reports.create(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          reason: initialReportReason,
        } satisfies IDiscussionBoardCommentReport.ICreate,
      },
    );
  typia.assert(report);
  // Validate initial report status
  TestValidator.equals(
    "initial report status is pending",
    report.status,
    "pending",
  );
  // Create super admin connection and authenticate using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  // Perform partial update: only modify resolution_details
  const resolutionDetails =
    "Moderator notes: Content reviewed and found to be within guidelines";
  const updatedReport =
    await api.functional.discussionBoard.superAdmin.articles.comments.reports.update(
      superAdminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        reportId: report.id,
        body: {
          resolution_details: resolutionDetails,
        } satisfies IDiscussionBoardCommentReport.IUpdate,
      },
    );
  typia.assert(updatedReport);
  // Validate partial update behavior
  TestValidator.equals(
    "report ID remains unchanged",
    updatedReport.id,
    report.id,
  );
  TestValidator.equals(
    "reason remains unchanged",
    updatedReport.reason,
    initialReportReason,
  );
  TestValidator.equals(
    "resolution details updated",
    updatedReport.resolution_details,
    resolutionDetails,
  );
  TestValidator.equals(
    "status remains unchanged",
    updatedReport.status,
    "pending",
  );
  TestValidator.equals(
    "reporter remains the same",
    updatedReport.reporter.id,
    report.reporter.id,
  );
  TestValidator.equals(
    "reported comment remains the same",
    updatedReport.reportedComment.id,
    report.reportedComment.id,
  );
}
