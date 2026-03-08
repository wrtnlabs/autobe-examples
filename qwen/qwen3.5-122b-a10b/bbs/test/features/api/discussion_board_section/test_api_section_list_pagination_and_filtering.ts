import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test section list retrieval with pagination and text filtering.
 *
 * This test verifies:
 * 1. Pagination works correctly with custom page and limit parameters
 * 2. Search filtering applies case-insensitive matching on name and description
 * 3. Pagination metadata reflects the filtered total count
 * 4. Edge case: empty search results return empty data array with pages=0
 * 5. Search term matching partial text in descriptions works correctly
 */
export async function test_api_section_list_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Basic pagination without search filter
  const paginationParams: IDiscussionBoardSection.IRequest = {
    page: 1,
    limit: 10,
    sort: "created_at",
    order: "desc",
  };
  const page1Result: IPageIDiscussionBoardSection.ISummary =
    await api.functional.discussionBoard.sections.index(connection, {
      body: paginationParams,
    });
  typia.assert(page1Result);
  // Verify pagination metadata structure
  TestValidator.equals(
    "page 1 current page",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 10);
  TestValidator.predicate(
    "page 1 has records",
    page1Result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 has pages",
    page1Result.pagination.pages >= 0,
  );
  // Test 2: Pagination on page 2
  const page2Params: IDiscussionBoardSection.IRequest = {
    page: 2,
    limit: 10,
    sort: "created_at",
    order: "desc",
  };
  const page2Result: IPageIDiscussionBoardSection.ISummary =
    await api.functional.discussionBoard.sections.index(connection, {
      body: page2Params,
    });
  typia.assert(page2Result);
  TestValidator.equals(
    "page 2 current page",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2Result.pagination.limit, 10);
  // Test 3: Search filtering with partial text match
  const searchTerm: string = RandomGenerator.alphabets(5);
  const searchParams: IDiscussionBoardSection.IRequest = {
    search: searchTerm,
    page: 1,
    limit: 20,
  };
  const searchResult: IPageIDiscussionBoardSection.ISummary =
    await api.functional.discussionBoard.sections.index(connection, {
      body: searchParams,
    });
  typia.assert(searchResult);
  // Verify search results are filtered
  TestValidator.equals(
    "search current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("search limit", searchResult.pagination.limit, 20);
  TestValidator.predicate(
    "search results match filter",
    searchResult.data.every(
      (section) =>
        section.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (section.description != null &&
          section.description.toLowerCase().includes(searchTerm.toLowerCase())),
    ),
  );
  // Test 4: Empty search results edge case
  const uniqueSearchTerm: string = `zzz_${RandomGenerator.alphaNumeric(10)}`;
  const emptySearchParams: IDiscussionBoardSection.IRequest = {
    search: uniqueSearchTerm,
    page: 1,
    limit: 20,
  };
  const emptySearchResult: IPageIDiscussionBoardSection.ISummary =
    await api.functional.discussionBoard.sections.index(connection, {
      body: emptySearchParams,
    });
  typia.assert(emptySearchResult);
  TestValidator.equals(
    "empty search has no data",
    emptySearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty search pages is 0",
    emptySearchResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty search records is 0",
    emptySearchResult.pagination.records,
    0,
  );
  // Test 5: Combined pagination and search on page 2
  const combinedParams: IDiscussionBoardSection.IRequest = {
    search: searchTerm,
    page: 2,
    limit: 5,
    sort: "name",
    order: "asc",
  };
  const combinedResult: IPageIDiscussionBoardSection.ISummary =
    await api.functional.discussionBoard.sections.index(connection, {
      body: combinedParams,
    });
  typia.assert(combinedResult);
  TestValidator.equals(
    "combined page 2 current",
    combinedResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "combined page 2 limit",
    combinedResult.pagination.limit,
    5,
  );
  // Test 6: Sorting verification
  const sortParams: IDiscussionBoardSection.IRequest = {
    page: 1,
    limit: 50,
    sort: "name",
    order: "asc",
  };
  const sortedResult: IPageIDiscussionBoardSection.ISummary =
    await api.functional.discussionBoard.sections.index(connection, {
      body: sortParams,
    });
  typia.assert(sortedResult);
  // Verify sections are sorted alphabetically by name
  if (sortedResult.data.length > 1) {
    for (let i = 1; i < sortedResult.data.length; i++) {
      TestValidator.predicate(
        `section ${i} name >= section ${i - 1} name`,
        sortedResult.data[i].name >= sortedResult.data[i - 1].name,
      );
    }
  }
  // Test 7: Verify section summary structure (business logic only)
  if (page1Result.data.length > 0) {
    const firstSection = page1Result.data[0];
    typia.assert(firstSection);
    TestValidator.predicate(
      "section has non-empty name",
      firstSection.name.length > 0,
    );
    TestValidator.predicate(
      "section has non-negative article_count",
      firstSection.article_count >= 0,
    );
  }
}
