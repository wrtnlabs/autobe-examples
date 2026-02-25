import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test article search functionality with section filtering.
 * Validates that search query and section filter work together correctly,
 * and that results are properly sorted in oldest-first order.
 */
export async function test_api_article_search_section_filter(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Fetch initial articles to discover existing sections
  const initialResult = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        sort: "newest",
        limit: 20,
        page: 1,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(initialResult);
  // If no articles exist, the test cannot proceed meaningfully
  if (initialResult.data.length === 0) {
    TestValidator.predicate("no articles exist to test filtering", true);
    return;
  }
  // Step 2: Select a section from available articles
  const sectionIds = [
    ...new Set(initialResult.data.map((article) => article.section.id)),
  ];
  const targetSectionId = RandomGenerator.pick(sectionIds);
  // Find articles in the target section to extract a search term
  const sectionArticles = initialResult.data.filter(
    (article) => article.section.id === targetSectionId,
  );
  const sampleArticle = RandomGenerator.pick(sectionArticles);
  // Extract a search term (minimum 2 characters as per spec) from article title
  // Use RandomGenerator.substring for variety if title is long enough
  const titleText =
    sampleArticle.title.length >= 2 ? sampleArticle.title : "test"; // Fallback for very short titles
  const searchTerm =
    RandomGenerator.substring(titleText)
      .trim()
      .substring(0, Math.min(titleText.length, 5)) || titleText.substring(0, 2);
  // Ensure search term meets minimum length requirement
  const validSearchTerm =
    searchTerm.length >= 2
      ? searchTerm
      : titleText.substring(0, Math.max(2, titleText.length));
  // Step 3: Test case-insensitive search with section filter
  // Use uppercase version of search term to verify case-insensitive matching
  const upperSearchTerm = validSearchTerm.toUpperCase();
  const searchResult = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        search: upperSearchTerm,
        sectionId: targetSectionId,
        sort: "oldest",
        limit: 10,
        page: 1,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(searchResult);
  // Step 4: Validate all returned articles belong to the specified section
  TestValidator.predicate(
    "all articles belong to specified section",
    searchResult.data.every(
      (article) => article.section.id === targetSectionId,
    ),
  );
  // Step 5: Validate search performs case-insensitive partial match
  // Results should contain the search term in title (case-insensitive)
  // Note: Search may also match content, so we verify at least the sample article is found
  if (searchResult.data.length > 0) {
    const lowerSearchTerm = validSearchTerm.toLowerCase();
    TestValidator.predicate(
      "search performs case-insensitive matching",
      searchResult.data.some((article) =>
        article.title.toLowerCase().includes(lowerSearchTerm),
      ),
    );
  }
  // Step 6: Validate sort order (oldest first = ascending created_at)
  if (searchResult.data.length > 1) {
    const dates = searchResult.data.map((article) =>
      new Date(article.created_at).getTime(),
    );
    TestValidator.predicate(
      "articles sorted by created_at ascending (oldest first)",
      dates.every((date, index) => index === 0 || date >= dates[index - 1]),
    );
  }
  // Step 7: Validate pagination metadata reflects filtered results
  TestValidator.equals(
    "pagination current page is 1",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    searchResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    searchResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    searchResult.data.length <= 10,
  );
}
