import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test pagination functionality with page and limit parameters to navigate
 * through large article result sets.
 *
 * This test validates that the article search API properly handles pagination
 * by:
 *
 * 1. Creating sufficient test data (30 published articles)
 * 2. Testing navigation across multiple pages with consistent page size
 * 3. Verifying pagination metadata (current page, total records, total pages,
 *    limit)
 * 4. Ensuring different pages return different result sets
 * 5. Validating that the limit parameter controls page size up to maximum of 100
 *
 * The test creates a complete test environment with moderator, category,
 * member, and multiple articles, then performs comprehensive pagination
 * validation to ensure efficient navigation through large result sets.
 */
export async function test_api_article_search_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for category management
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create article category for test articles
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Test Category " + RandomGenerator.name(1),
          slug: "test-category-" + RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account for authoring articles
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create 30 published articles for pagination testing
  const articleCount = 30;
  const createdArticles = await ArrayUtil.asyncRepeat(
    articleCount,
    async (index) => {
      const article =
        await api.functional.discussionBoard.member.articles.create(
          connection,
          {
            body: {
              title: `Test Article ${index + 1} - ${RandomGenerator.name(3)}`,
              body: RandomGenerator.content({
                paragraphs: 3,
                sentenceMin: 10,
                sentenceMax: 20,
              }),
              discussion_board_article_category_id: category.id,
              status: "published",
            } satisfies IDiscussionBoardArticle.ICreate,
          },
        );
      typia.assert(article);
      return article;
    },
  );

  // Step 5: Test pagination with limit=10 across multiple pages
  const limit = 10;

  // Test page 1
  const page1Result = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: limit,
        discussion_board_article_category_id: category.id,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(page1Result);

  // Verify page 1 pagination metadata
  TestValidator.equals(
    "page 1 current page",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, limit);
  TestValidator.equals(
    "page 1 total records",
    page1Result.pagination.records,
    articleCount,
  );
  TestValidator.equals(
    "page 1 total pages",
    page1Result.pagination.pages,
    Math.ceil(articleCount / limit),
  );
  TestValidator.equals("page 1 data length", page1Result.data.length, limit);

  // Test page 2
  const page2Result = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 2,
        limit: limit,
        discussion_board_article_category_id: category.id,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(page2Result);

  // Verify page 2 pagination metadata
  TestValidator.equals(
    "page 2 current page",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2Result.pagination.limit, limit);
  TestValidator.equals(
    "page 2 total records",
    page2Result.pagination.records,
    articleCount,
  );
  TestValidator.equals("page 2 data length", page2Result.data.length, limit);

  // Test page 3
  const page3Result = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 3,
        limit: limit,
        discussion_board_article_category_id: category.id,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(page3Result);

  // Verify page 3 pagination metadata
  TestValidator.equals(
    "page 3 current page",
    page3Result.pagination.current,
    3,
  );
  TestValidator.equals("page 3 limit", page3Result.pagination.limit, limit);
  TestValidator.equals(
    "page 3 total records",
    page3Result.pagination.records,
    articleCount,
  );
  TestValidator.equals("page 3 data length", page3Result.data.length, limit);

  // Step 6: Verify different pages return different result sets
  const page1Ids = page1Result.data.map((article) => article.id);
  const page2Ids = page2Result.data.map((article) => article.id);
  const page3Ids = page3Result.data.map((article) => article.id);

  // Check no overlap between page 1 and page 2
  const page1And2Overlap = page1Ids.filter((id) => page2Ids.includes(id));
  TestValidator.equals(
    "no overlap between page 1 and 2",
    page1And2Overlap.length,
    0,
  );

  // Check no overlap between page 2 and page 3
  const page2And3Overlap = page2Ids.filter((id) => page3Ids.includes(id));
  TestValidator.equals(
    "no overlap between page 2 and 3",
    page2And3Overlap.length,
    0,
  );

  // Check no overlap between page 1 and page 3
  const page1And3Overlap = page1Ids.filter((id) => page3Ids.includes(id));
  TestValidator.equals(
    "no overlap between page 1 and 3",
    page1And3Overlap.length,
    0,
  );

  // Step 7: Test different limit values
  const limit5Result = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
        discussion_board_article_category_id: category.id,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(limit5Result);
  TestValidator.equals("limit 5 data length", limit5Result.data.length, 5);
  TestValidator.equals(
    "limit 5 pagination limit",
    limit5Result.pagination.limit,
    5,
  );

  const limit20Result = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
        discussion_board_article_category_id: category.id,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(limit20Result);
  TestValidator.equals("limit 20 data length", limit20Result.data.length, 20);
  TestValidator.equals(
    "limit 20 pagination limit",
    limit20Result.pagination.limit,
    20,
  );

  const limit50Result = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 50,
        discussion_board_article_category_id: category.id,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(limit50Result);
  TestValidator.equals(
    "limit 50 data length",
    limit50Result.data.length,
    articleCount,
  );
  TestValidator.equals(
    "limit 50 pagination limit",
    limit50Result.pagination.limit,
    50,
  );

  // Step 8: Test maximum limit constraint (100 items)
  const limit100Result = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
        discussion_board_article_category_id: category.id,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(limit100Result);
  TestValidator.equals(
    "limit 100 pagination limit",
    limit100Result.pagination.limit,
    100,
  );
  TestValidator.equals(
    "limit 100 data length",
    limit100Result.data.length,
    articleCount,
  );

  // Step 9: Verify last page has correct number of items
  const totalPages = Math.ceil(articleCount / limit);
  const lastPageResult = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: totalPages,
        limit: limit,
        discussion_board_article_category_id: category.id,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(lastPageResult);

  const expectedLastPageItems = articleCount - limit * (totalPages - 1);
  TestValidator.equals(
    "last page data length",
    lastPageResult.data.length,
    expectedLastPageItems,
  );
  TestValidator.equals(
    "last page current",
    lastPageResult.pagination.current,
    totalPages,
  );
}
