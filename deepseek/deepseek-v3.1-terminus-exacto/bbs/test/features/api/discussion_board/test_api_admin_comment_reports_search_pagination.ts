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
import { generate_random_discussion_board_user_articles_comments_reports_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_reports_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_comment_report } from "../../../prepare/prepare_random_discussion_board_comment_report";

export async function test_api_admin_comment_reports_search_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234",
      display_name: "Test Admin",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create multiple user connections
  const userConnections: api.IConnection[] = ArrayUtil.repeat(3, () => ({
    host: connection.host,
  }));
  // Create users and authenticate them
  for (let i = 0; i < userConnections.length; i++) {
    await authorize_user_join(userConnections[i], {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "user1234",
        display_name: `Test User ${i + 1}`,
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardUser.IJoin,
    });
  }
  // Create an article - using a placeholder section_id since we don't have section creation
  // Assuming the system has at least one active section
  const article = await generate_random_discussion_board_user_articles_create(
    userConnections[0],
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        section_id: typia.random<string & tags.Format<"uuid">>(), // This may fail if section doesn't exist
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create a comment on the article
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnections[0],
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(comment);
  // Create multiple reports for the comment from different users
  const reports: IDiscussionBoardCommentReport[] = [];
  for (let i = 0; i < userConnections.length; i++) {
    const report =
      await generate_random_discussion_board_user_articles_comments_reports_create(
        userConnections[i],
        {
          body: {
            reason: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IDiscussionBoardCommentReport.ICreate,
          params: {
            articleId: article.id,
            commentId: comment.id,
          },
        },
      );
    typia.assert(report);
    reports.push(report);
  }
  // Test search with pagination - page 1, limit 2
  const searchResult1 =
    await api.functional.discussionBoard.admin.articles.comments.reports.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          page: 1,
          limit: 2,
          sort: "created_at_desc" as const,
        } satisfies IDiscussionBoardCommentReport.IRequest,
      },
    );
  typia.assert(searchResult1);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    searchResult1.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResult1.pagination.limit, 2);
  TestValidator.equals(
    "pagination total records",
    searchResult1.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination total pages",
    searchResult1.pagination.pages,
    2,
  );
  // Validate data length
  TestValidator.equals("page 1 data count", searchResult1.data.length, 2);
  // Test search with pagination - page 2, limit 2
  const searchResult2 =
    await api.functional.discussionBoard.admin.articles.comments.reports.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          page: 2,
          limit: 2,
          sort: "created_at_desc" as const,
        } satisfies IDiscussionBoardCommentReport.IRequest,
      },
    );
  typia.assert(searchResult2);
  // Validate pagination metadata for page 2
  TestValidator.equals(
    "page 2 pagination current page",
    searchResult2.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 pagination limit",
    searchResult2.pagination.limit,
    2,
  );
  TestValidator.equals(
    "page 2 pagination total records",
    searchResult2.pagination.records,
    3,
  );
  TestValidator.equals(
    "page 2 pagination total pages",
    searchResult2.pagination.pages,
    2,
  );
  // Validate data length for page 2
  TestValidator.equals("page 2 data count", searchResult2.data.length, 1);
  // Test search with different sorting
  const searchResultAsc =
    await api.functional.discussionBoard.admin.articles.comments.reports.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          page: 1,
          limit: 10,
          sort: "created_at_asc" as const,
        } satisfies IDiscussionBoardCommentReport.IRequest,
      },
    );
  typia.assert(searchResultAsc);
  // Validate all reports are returned
  TestValidator.equals("all reports returned", searchResultAsc.data.length, 3);
  // Validate reporter information is included
  for (const reportSummary of searchResultAsc.data) {
    TestValidator.predicate(
      "report has reporter",
      reportSummary.reporter !== undefined,
    );
    TestValidator.predicate(
      "reporter has display name",
      reportSummary.reporter.display_name.length > 0,
    );
    TestValidator.predicate(
      "report has reason",
      reportSummary.reason.length > 0,
    );
    TestValidator.predicate(
      "report has status",
      reportSummary.status.length > 0,
    );
    TestValidator.predicate(
      "report has creation timestamp",
      reportSummary.created_at.length > 0,
    );
  }
}
