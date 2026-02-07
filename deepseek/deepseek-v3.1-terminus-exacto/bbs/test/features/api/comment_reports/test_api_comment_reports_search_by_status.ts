import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
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
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

export async function test_api_comment_reports_search_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create user connection
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create article
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create comment
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
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
  // Test search functionality with different status filters
  // Since we cannot create actual reports, we test the search endpoint's filtering capability
  for (const status of ["pending", "under_review", "resolved", null] as const) {
    const searchResult =
      await api.functional.discussionBoard.superAdmin.articles.comments.reports.index(
        superAdminConnection,
        {
          articleId: article.id,
          commentId: comment.id,
          body: {
            status: status,
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardComment.IRequestReport,
        },
      );
    typia.assert(searchResult);
    // Validate pagination structure
    TestValidator.equals(
      "pagination current page",
      searchResult.pagination.current,
      1,
    );
    TestValidator.equals("pagination limit", searchResult.pagination.limit, 10);
    TestValidator.predicate(
      "pagination records non-negative",
      searchResult.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages non-negative",
      searchResult.pagination.pages >= 0,
    );
    // Validate that pagination calculations are correct
    TestValidator.predicate(
      "pagination pages calculation",
      searchResult.pagination.pages ===
        Math.ceil(
          searchResult.pagination.records / searchResult.pagination.limit,
        ),
    );
    // Validate each report in the response
    for (const report of searchResult.data) {
      typia.assert(report);
      // Validate basic report structure
      TestValidator.predicate(
        "report has valid UUID id",
        /^[0-9a-f-]{36}$/i.test(report.id),
      );
      TestValidator.predicate(
        "report has valid status",
        ["pending", "under_review", "resolved"].includes(report.status),
      );
      TestValidator.predicate(
        "report has non-empty reason",
        report.reason.length > 0,
      );
      // Validate reporter information
      TestValidator.predicate(
        "reporter has valid UUID",
        /^[0-9a-f-]{36}$/i.test(report.reporter.id),
      );
      TestValidator.predicate(
        "reporter has display name",
        report.reporter.display_name.length > 0,
      );
      // Validate timestamps
      TestValidator.predicate(
        "report has valid created_at timestamp",
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(report.created_at),
      );
      TestValidator.predicate(
        "report has valid updated_at timestamp",
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(report.updated_at),
      );
      // If status filter is applied, validate that returned reports match the filter
      if (status !== null) {
        TestValidator.equals(
          `reports should have ${status} status`,
          report.status,
          status,
        );
      }
    }
  }
  // Test pagination with different page sizes
  const paginationTest =
    await api.functional.discussionBoard.superAdmin.articles.comments.reports.index(
      superAdminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          status: null,
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardComment.IRequestReport,
      },
    );
  typia.assert(paginationTest);
  TestValidator.equals(
    "pagination test limit",
    paginationTest.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data length should not exceed limit",
    paginationTest.data.length <= 5,
  );
}
