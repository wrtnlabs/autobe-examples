import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_article_search_with_keyword_and_tag_filter(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Basic keyword search
  const keyword = "test";
  const keywordResult = await api.functional.discussionBoard.articles.search(
    connection,
    {
      body: {
        search: keyword,
        page: 1,
        limit: 20,
        sortBy: "created_at",
        sortOrder: "desc",
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(keywordResult);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    keywordResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    keywordResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    keywordResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    keywordResult.pagination.pages >= 0,
  );
  // Validate article summary structure if results exist
  if (keywordResult.data.length > 0) {
    const firstArticle = keywordResult.data[0];
    typia.assert(firstArticle);
    TestValidator.predicate("article has title", firstArticle.title.length > 0);
  }
  // Test 2: Tag filtering with empty array (should return all articles)
  const tagFilterResult = await api.functional.discussionBoard.articles.search(
    connection,
    {
      body: {
        tagIds: [],
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(tagFilterResult);
  TestValidator.equals(
    "tag filter pagination current",
    tagFilterResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "tag filter pagination limit",
    tagFilterResult.pagination.limit,
    10,
  );
  // Test 3: Pagination with different page and limit
  const paginationResult = await api.functional.discussionBoard.articles.search(
    connection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(paginationResult);
  TestValidator.equals(
    "page 2 current",
    paginationResult.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", paginationResult.pagination.limit, 5);
  TestValidator.predicate(
    "page 2 data array length <= limit",
    paginationResult.data.length <= 5,
  );
  // Test 4: Sorting by title ascending
  const sortResult = await api.functional.discussionBoard.articles.search(
    connection,
    {
      body: {
        sortBy: "title",
        sortOrder: "asc",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(sortResult);
  // Test 5: Default sorting (created_at desc - newest first)
  const defaultSortResult =
    await api.functional.discussionBoard.articles.search(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(defaultSortResult);
  // Test 6: Verify all article summaries have complete structure
  const allResults = await api.functional.discussionBoard.articles.search(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(allResults);
  // Validate structure of each article in results
  for (const article of allResults.data) {
    typia.assert(article);
    TestValidator.predicate("article has title", article.title.length > 0);
  }
}
