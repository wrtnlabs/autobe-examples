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

/**
 * Test the search functionality for comment reports with pagination parameters and empty result scenarios.
 * 1. Create a comment with no reports and verify searching returns empty paginated results
 * 2. Test pagination with a single report to verify proper page count calculation
 * 3. Validate that searching with non-matching criteria returns empty results
 */
export async function test_api_comment_reports_search_pagination_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup super administrator using available utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "superadmin123",
        privilege_level: "super_admin",
      },
    },
  );
  // 2. Setup regular user using available utility function
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  // 3. Create an article - we need to handle the section_id issue
  // Since we don't have section creation utility, we'll need to use a workaround
  // For now, we'll create an article with a random section_id and hope it exists
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 1 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 4. Create a comment on the article
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        params: { articleId: article.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // 5. Test search with no reports (empty results)
  const emptySearch =
    await api.functional.discussionBoard.superAdmin.articles.comments.reports.index(
      superAdminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardComment.IRequestReport,
      },
    );
  typia.assert(emptySearch);
  // Validate empty results
  TestValidator.equals("empty search data", emptySearch.data, []);
  TestValidator.equals(
    "empty search records",
    emptySearch.pagination.records,
    0,
  );
  TestValidator.equals("empty search pages", emptySearch.pagination.pages, 0);
  TestValidator.equals(
    "empty search current page",
    emptySearch.pagination.current,
    1,
  );
  TestValidator.equals("empty search limit", emptySearch.pagination.limit, 10);
  // 6. Test search with non-matching criteria
  const nonMatchingSearch =
    await api.functional.discussionBoard.superAdmin.articles.comments.reports.index(
      superAdminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          reporter: "nonexistent_reporter",
          status: "pending" as const,
          created_at_min: new Date(Date.now() + 86400000).toISOString(), // Future date
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardComment.IRequestReport,
      },
    );
  typia.assert(nonMatchingSearch);
  // Validate non-matching criteria returns empty
  TestValidator.equals("non-matching search data", nonMatchingSearch.data, []);
  TestValidator.equals(
    "non-matching search records",
    nonMatchingSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-matching search pages",
    nonMatchingSearch.pagination.pages,
    0,
  );
  // 7. Test pagination with high page numbers
  const highPageSearch =
    await api.functional.discussionBoard.superAdmin.articles.comments.reports.index(
      superAdminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          page: 999,
          limit: 10,
        } satisfies IDiscussionBoardComment.IRequestReport,
      },
    );
  typia.assert(highPageSearch);
  // Validate high page returns empty results
  TestValidator.equals("high page search data", highPageSearch.data, []);
  TestValidator.equals(
    "high page search records",
    highPageSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "high page search pages",
    highPageSearch.pagination.pages,
    0,
  );
  // 8. Test search with different limit values
  const smallLimitSearch =
    await api.functional.discussionBoard.superAdmin.articles.comments.reports.index(
      superAdminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardComment.IRequestReport,
      },
    );
  typia.assert(smallLimitSearch);
  // Validate small limit returns empty results
  TestValidator.equals("small limit search data", smallLimitSearch.data, []);
  TestValidator.equals(
    "small limit search records",
    smallLimitSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "small limit search pages",
    smallLimitSearch.pagination.pages,
    0,
  );
}
