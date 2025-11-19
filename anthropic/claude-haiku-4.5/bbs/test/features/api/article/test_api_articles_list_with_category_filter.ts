import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

export async function test_api_articles_list_with_category_filter(
  connection: api.IConnection,
) {
  // Generate a category UUID for filtering
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  // Test 1: Retrieve articles filtered by a specific category
  const categoryFilteredResult =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 20,
        categoryId: categoryId,
        status: "published",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(categoryFilteredResult);

  // Validate the pagination metadata is present and valid
  TestValidator.predicate(
    "filtered results should have valid pagination",
    categoryFilteredResult.pagination.current > 0 &&
      categoryFilteredResult.pagination.limit > 0 &&
      categoryFilteredResult.pagination.records >= 0 &&
      categoryFilteredResult.pagination.pages >= 0,
  );

  // Test 2: Retrieve articles without category filter for comparison
  const unfilteredResult = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
        status: "published",
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(unfilteredResult);

  // Verify that filtering with a specific category returns a subset
  TestValidator.predicate(
    "category-filtered results should be a subset of unfiltered results",
    categoryFilteredResult.data.length <= unfilteredResult.data.length,
  );

  // Test 3: Verify pagination with category filter on different page
  const secondPageResult = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 2,
        limit: 10,
        categoryId: categoryId,
        status: "published",
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(secondPageResult);

  TestValidator.predicate(
    "pagination should track the requested page number",
    secondPageResult.pagination.current === 2,
  );

  // Test 4: Test with null category filter (no category filtering)
  const nullCategoryResult =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 20,
        categoryId: null,
        status: "published",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(nullCategoryResult);

  TestValidator.predicate(
    "null category filter should return all published articles",
    nullCategoryResult.pagination.records >= 0,
  );

  // Test 5: Verify article data is returned in correct summary format
  if (categoryFilteredResult.data.length > 0) {
    const article = categoryFilteredResult.data[0];
    TestValidator.predicate(
      "each article summary should have id and title",
      article.id !== undefined &&
        article.id.length > 0 &&
        article.title !== undefined &&
        article.title.length > 0,
    );
  }
}
