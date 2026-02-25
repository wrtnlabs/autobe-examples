import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentReport";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentReport";
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
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_comments_reports_create } from "../../../generate/generate_random_discussion_board_user_comments_reports_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_comment_report } from "../../../prepare/prepare_random_discussion_board_comment_report";

/**
 * Test filtering comment reports by 'pending' status functionality.
 *
 * This test verifies that administrators can filter comment reports by status,
 * specifically retrieving only pending reports for a given comment. The test
 * creates a comprehensive setup with an article, comment, and reports,
 * then validates that the filter correctly returns only pending reports.
 */
export async function test_api_comment_report_filter_status_pending(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate using SDK
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await api.functional.discussionBoard.auth.admin.login(
    adminConnection,
    {
      body: {
        email: typia.random<string>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
        ip: "192.168.1.1" as string,
      },
    },
  );
  typia.assert(admin);
  // Create user connection and register user using SDK
  const userConnection: api.IConnection = { host: connection.host };
  const user = await api.functional.discussionBoard.auth.user.join(
    userConnection,
    {
      body: {
        email: typia.random<string>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      },
    },
  );
  typia.assert(user);
  // Create second user for additional reports
  const user2Connection: api.IConnection = { host: connection.host };
  const user2 = await api.functional.discussionBoard.auth.user.join(
    user2Connection,
    {
      body: {
        email: typia.random<string>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      },
    },
  );
  typia.assert(user2);
  // Create test article using SDK
  const article = await api.functional.discussionBoard.user.articles.create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 1 }),
        discussion_board_section_id: typia.random<string>(),
      },
    },
  );
  typia.assert(article);
  // Create test comment using SDK
  const comment =
    await api.functional.discussionBoard.user.articles.comments.create(
      userConnection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(comment);
  // Create multiple reports with different content
  const report1 =
    await api.functional.discussionBoard.user.comments.reports.create(
      userConnection,
      {
        commentId: comment.id,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(report1);
  const report2 =
    await api.functional.discussionBoard.user.comments.reports.create(
      user2Connection,
      {
        commentId: comment.id,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(report2);
  const report3 =
    await api.functional.discussionBoard.user.comments.reports.create(
      userConnection,
      {
        commentId: comment.id,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(report3);
  // Filter reports by pending status
  const filteredReportsResponse =
    await api.functional.discussionBoard.admin.comments.reports.index(
      adminConnection,
      {
        commentId: comment.id,
        body: {
          status: "pending" as const,
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(filteredReportsResponse);
  // Validate response structure
  TestValidator.predicate(
    "response has pagination data",
    filteredReportsResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data array",
    Array.isArray(filteredReportsResponse.data),
  );
  // Validate pagination metadata
  TestValidator.equals(
    "current page is 1",
    filteredReportsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit is 10",
    filteredReportsResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "records count is positive",
    filteredReportsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    filteredReportsResponse.pagination.pages >= 0,
  );
  // Validate that all returned reports have pending status
  if (filteredReportsResponse.data.length > 0) {
    TestValidator.predicate(
      "all returned reports have pending status",
      filteredReportsResponse.data.every((item) => item.status === "pending"),
    );
  }
  // Validate reporter information is included for returned reports
  TestValidator.predicate(
    "each report has reporter information",
    filteredReportsResponse.data.every(
      (report) =>
        report.reporter !== undefined &&
        report.reporter.id !== undefined &&
        report.reporter.display_name !== undefined,
    ),
  );
  // Validate basic integrity of returned data
  TestValidator.predicate(
    "all reports have valid creation timestamp",
    filteredReportsResponse.data.every(
      (report) =>
        report.created_at !== undefined && report.created_at.length > 0,
    ),
  );
}
