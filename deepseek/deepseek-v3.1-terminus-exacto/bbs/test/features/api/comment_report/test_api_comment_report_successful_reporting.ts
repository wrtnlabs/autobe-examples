import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentReport";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_comments_reports_create } from "../../../generate/generate_random_discussion_board_user_comments_reports_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_comment_report } from "../../../prepare/prepare_random_discussion_board_comment_report";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test successful comment reporting workflow where authenticated user reports an inappropriate comment.
 * Verifies that created report has 'pending' status, contains correct reporter information,
 * properly associates with target comment, and prevents duplicate reports from same user.
 */
export async function test_api_comment_report_successful_reporting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and create a section
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: "Admin User",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: "Test Section",
        description: "Test section for comment reporting",
        status: "active",
        display_order: 1,
      },
    },
  );
  typia.assert(section);
  // 2. Create comment author user account
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_user_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "author123",
      display_name: "Comment Author",
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // 3. Author creates article
  const article = await generate_random_discussion_board_user_articles_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content: RandomGenerator.content({ paragraphs: 1 }),
        discussion_board_section_id: section.id,
      },
    },
  );
  typia.assert(article);
  // 4. Author creates comment to be reported
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      authorConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        },
        params: { articleId: article.id },
      },
    );
  typia.assert(comment);
  // 5. Create reporter user account
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter = await authorize_user_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "reporter123",
      display_name: "Reporter User",
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // 6. Reporter submits report with valid reason
  const reportBody = {
    reason: "This comment contains inappropriate content",
  } satisfies IDiscussionBoardCommentReport.ICreate;
  const report =
    await generate_random_discussion_board_user_comments_reports_create(
      reporterConnection,
      {
        body: reportBody,
        params: { commentId: comment.id },
      },
    );
  typia.assert(report);
  // 7. Verify report status is 'pending'
  TestValidator.equals(
    "report status should be pending",
    report.status,
    "pending",
  );
  // 8. Verify reporter information matches authenticated user
  TestValidator.equals(
    "reporter ID should match authenticated user",
    report.reporter.id,
    reporter.id,
  );
  TestValidator.equals(
    "reporter display name should match",
    report.reporter.display_name,
    reporter.display_name,
  );
  // 9. Verify reported comment association
  TestValidator.equals(
    "reported comment ID should match",
    report.reportedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "reported comment content should match",
    report.reportedComment.content,
    comment.content,
  );
  // 10. Verify report reason matches input
  TestValidator.equals(
    "report reason should match input",
    report.reason,
    reportBody.reason,
  );
  // 11. Attempt duplicate report and verify prevention mechanism
  await TestValidator.error(
    "should prevent duplicate report from same user",
    async () => {
      await generate_random_discussion_board_user_comments_reports_create(
        reporterConnection,
        {
          body: {
            reason: "Another report attempt",
          } satisfies IDiscussionBoardCommentReport.ICreate,
          params: { commentId: comment.id },
        },
      );
    },
  );
}
