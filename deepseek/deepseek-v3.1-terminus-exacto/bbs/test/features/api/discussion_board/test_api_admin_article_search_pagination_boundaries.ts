import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
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
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test the pagination system at its boundaries and edge cases for admin article search functionality.
 * Create a sufficient number of test articles to test multiple pages. Test scenarios include:
 * requesting the first page with various limit sizes, requesting the last page with partial results,
 * requesting pages beyond the total page count, testing minimum and maximum limit values,
 * and verifying that pagination metadata is calculated correctly.
 */
export async function test_api_admin_article_search_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234",
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // Create user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user1234",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create test section
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // Create 25+ test articles
  const totalArticles = 27; // Creates 3 full pages with limit=10
  const articles = await ArrayUtil.asyncRepeat(totalArticles, async () => {
    const article = await generate_random_discussion_board_user_articles_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          section_id: section.id,
          status: "published" as const,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
    typia.assert(article);
    return article;
  });
  // Test 1: First page with various limit sizes
  const firstPageTests = [
    { limit: 1, expectedCount: 1 },
    { limit: 10, expectedCount: 10 },
    { limit: 25, expectedCount: 25 },
  ];
  for (const test of firstPageTests) {
    const result = await api.functional.discussionBoard.admin.articles.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: test.limit,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
    typia.assert(result);
    TestValidator.equals(
      `first page with limit=${test.limit} should return ${test.expectedCount} articles`,
      result.data.length,
      Math.min(test.expectedCount, totalArticles),
    );
    TestValidator.equals(
      `first page with limit=${test.limit} should have correct pagination metadata`,
      result.pagination.current,
      1,
    );
    TestValidator.equals(
      `first page with limit=${test.limit} should have correct limit`,
      result.pagination.limit,
      test.limit,
    );
    TestValidator.equals(
      `first page with limit=${test.limit} should have correct total records`,
      result.pagination.records,
      totalArticles,
    );
    TestValidator.predicate(
      `first page with limit=${test.limit} should have correct total pages`,
      result.pagination.pages === Math.ceil(totalArticles / test.limit),
    );
  }
  // Test 2: Last page with partial results
  const limit = 10;
  const lastPage = Math.ceil(totalArticles / limit);
  const lastPageResult =
    await api.functional.discussionBoard.admin.articles.index(adminConnection, {
      body: {
        page: lastPage,
        limit: limit,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(lastPageResult);
  TestValidator.equals(
    `last page should return partial results`,
    lastPageResult.data.length,
    totalArticles % limit,
  );
  TestValidator.equals(
    `last page should have correct current page`,
    lastPageResult.pagination.current,
    lastPage,
  );
  // Test 3: Page beyond total page count
  const beyondPageResult =
    await api.functional.discussionBoard.admin.articles.index(adminConnection, {
      body: {
        page: lastPage + 1,
        limit: limit,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(beyondPageResult);
  TestValidator.equals(
    `page beyond total count should return empty data`,
    beyondPageResult.data.length,
    0,
  );
  TestValidator.equals(
    `page beyond total count should have correct current page`,
    beyondPageResult.pagination.current,
    lastPage + 1,
  );
  // Test 4: Minimum and maximum limit values
  const minLimitResult =
    await api.functional.discussionBoard.admin.articles.index(adminConnection, {
      body: {
        page: 1,
        limit: 1,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(minLimitResult);
  TestValidator.equals(
    `minimum limit should work correctly`,
    minLimitResult.pagination.limit,
    1,
  );
  const maxLimitResult =
    await api.functional.discussionBoard.admin.articles.index(adminConnection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(maxLimitResult);
  TestValidator.equals(
    `maximum limit should work correctly`,
    maxLimitResult.pagination.limit,
    100,
  );
  // Test 5: Pagination metadata consistency
  const consistencyResult =
    await api.functional.discussionBoard.admin.articles.index(adminConnection, {
      body: {
        page: 2,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(consistencyResult);
  TestValidator.predicate(
    `pagination metadata should be consistent`,
    consistencyResult.pagination.pages ===
      Math.ceil(
        consistencyResult.pagination.records /
          consistencyResult.pagination.limit,
      ),
  );
}
