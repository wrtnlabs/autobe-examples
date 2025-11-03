import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Validate paginated retrieval of discussion board articles for public access.
 *
 * This test confirms that guest users can fetch a paginated list of articles
 * with optional search, sorting, and filtering applied. It ensures that the API
 * properly respects pagination parameters, delivers accurate metadata, and
 * excludes deleted articles.
 *
 * The test covers:
 *
 * 1. Fetch with page=1 and limit=10 to check pagination works correctly.
 * 2. Validate response structure and type safety of the paginated data and
 *    metadata.
 * 3. Verify all articles do not have deleted_at (exclude logically deleted).
 * 4. Use search_text filter with a known substring to test text search filtering.
 * 5. Use sorting by "created_at" in descending order to verify sorting.
 * 6. Check consistency of pagination metadata (page count, records, etc.).
 */
export async function test_api_discussion_board_articles_pagination_and_search_public_access(
  connection: api.IConnection,
) {
  // Step 1: Basic pagination fetch
  const page1Request = {
    page: 1,
    limit: 10,
    search_text: null,
    sort: null,
    order: null,
  } satisfies IDiscussionBoardArticle.IRequest;

  const page1Response =
    await api.functional.discussionBoard.discussionBoardArticles.index(
      connection,
      { body: page1Request },
    );

  typia.assert(page1Response);

  // Validate pagination metadata
  TestValidator.predicate(
    "Pagination metadata current page is 1",
    page1Response.pagination.current === 1,
  );
  TestValidator.predicate(
    "Pagination metadata limit is 10",
    page1Response.pagination.limit === 10,
  );
  TestValidator.predicate(
    "Pagination metadata pages >= current",
    page1Response.pagination.pages >= page1Response.pagination.current,
  );
  TestValidator.predicate(
    "Pagination records >= 0",
    page1Response.pagination.records >= 0,
  );

  // Validate each article summary
  for (const article of page1Response.data) {
    typia.assert(article);
    // deleted_at must be null or undefined
    TestValidator.predicate(
      `article ${article.id} deleted_at is null or undefined`,
      article.deleted_at === null || article.deleted_at === undefined,
    );
  }

  // Step 2: Search with known text substring
  if (page1Response.data.length === 0) {
    // No articles to test search with - skip search test
    return;
  }

  // Pick a word from the first article's title or a substring of it
  const firstTitle = page1Response.data[0].title;
  const searchWord =
    firstTitle.length > 3 ? firstTitle.substring(0, 3) : firstTitle;

  const searchRequest = {
    page: 1,
    limit: 10,
    search_text: searchWord,
    sort: "created_at",
    order: "desc",
  } satisfies IDiscussionBoardArticle.IRequest;

  const searchResponse =
    await api.functional.discussionBoard.discussionBoardArticles.index(
      connection,
      { body: searchRequest },
    );

  typia.assert(searchResponse);

  // Validate pagination metadata for search
  TestValidator.predicate(
    "Search pagination current page is 1",
    searchResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "Search pagination limit is 10",
    searchResponse.pagination.limit === 10,
  );
  TestValidator.predicate(
    "Search pagination pages >= current",
    searchResponse.pagination.pages >= searchResponse.pagination.current,
  );

  // Check that all returned articles include the search text in title or
  // content (cannot access content directly, so check only title here)
  for (const article of searchResponse.data) {
    typia.assert(article);
    TestValidator.predicate(
      `article ${article.id} title includes search text`,
      article.title.toLowerCase().includes(searchWord.toLowerCase()),
    );
    // deleted_at must be null or undefined
    TestValidator.predicate(
      `article ${article.id} deleted_at is null or undefined in search results`,
      article.deleted_at === null || article.deleted_at === undefined,
    );
  }

  // Validate sorting order (created_at descending)
  for (let i = 1; i < searchResponse.data.length; i++) {
    const prev = searchResponse.data[i - 1].created_at;
    const curr = searchResponse.data[i].created_at;
    TestValidator.predicate(
      `Article ${searchResponse.data[i - 1].id} created_at >= Article ${searchResponse.data[i].id} created_at`,
      prev >= curr,
    );
  }
}
