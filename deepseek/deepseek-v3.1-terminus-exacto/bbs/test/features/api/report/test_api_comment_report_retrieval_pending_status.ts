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

export async function test_api_comment_report_retrieval_pending_status(
  connection: api.IConnection,
): Promise<void> {
  // Create superAdmin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminCredentials = await authorize_super_admin_login(
    superAdminConnection,
    {
      body: {
        email: "admin@test.com",
        password: "admin123456",
      },
    },
  );
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userCredentials = await authorize_user_join(userConnection, {
    body: {
      email: "test@example.com",
      password: "password",
      display_name: "Test User",
    },
  });
  // Create reporter connection and authenticate
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterCredentials = await authorize_user_join(reporterConnection, {
    body: {
      email: "reporter@example.com",
      password: "reporter_password",
      display_name: "Reporter User",
    },
  });
  // Create article using user credentials
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.paragraph({ sentences: 5 }),
        section_id: "some-section-id", // This would need to be a valid section ID
        status: "published",
      },
    },
  );
  // Create comment on the article
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        params: { articleId: article.id },
      },
    );
  // Create comment report with pending status
  const report =
    await generate_random_discussion_board_user_articles_comments_reports_create(
      reporterConnection,
      {
        params: {
          articleId: article.id,
          commentId: comment.id,
        },
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  // Retrieve the report using superAdmin credentials
  const retrievedReport =
    await api.functional.discussionBoard.superAdmin.articles.comments.reports.at(
      superAdminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        reportId: report.id,
      },
    );
  // Validate the report details
  typia.assert(retrievedReport);
  TestValidator.equals("report ID matches", retrievedReport.id, report.id);
  TestValidator.equals(
    "report reason matches",
    retrievedReport.reason,
    report.reason,
  );
  TestValidator.equals(
    "report status is pending",
    retrievedReport.status,
    "pending",
  );
  // Validate pending report fields are null
  TestValidator.equals(
    "resolution details should be null",
    retrievedReport.resolution_details,
    null,
  );
  TestValidator.equals(
    "resolved at should be null",
    retrievedReport.resolved_at,
    null,
  );
  // Validate reporter information
  TestValidator.equals(
    "reporter ID matches",
    retrievedReport.reporter.id,
    reporterCredentials.id,
  );
  TestValidator.equals(
    "reporter display name matches",
    retrievedReport.reporter.display_name,
    reporterCredentials.display_name,
  );
  // Validate reported comment information
  TestValidator.equals(
    "reported comment ID matches",
    retrievedReport.reportedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "reported comment content matches",
    retrievedReport.reportedComment.content,
    comment.content,
  );
}
