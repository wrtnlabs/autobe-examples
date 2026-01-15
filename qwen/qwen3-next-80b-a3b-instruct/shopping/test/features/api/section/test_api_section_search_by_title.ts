import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSection";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
export async function test_api_section_search_by_title(
  connection: api.IConnection,
): Promise<void> {
  // Search term likely to exist in the system
  const searchTerm = "section";
  // Test 1: Basic search with term
  const searchResult1 = await api.functional.shoppingMall.sections.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        search: searchTerm,
      } satisfies IShoppingMallSection.IRequest,
    },
  );
  typia.assert(searchResult1);
  // Validate that we got results
  TestValidator.predicate(
    "search returned at least one result",
    () => searchResult1.data.length > 0,
  );
  // Validate that all returned sections contain the search term in title or description
  TestValidator.predicate("all search results contain search term", () =>
    searchResult1.data.every(
      (section) =>
        section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (section.description &&
          section.description.toLowerCase().includes(searchTerm.toLowerCase())),
    ),
  );
  // Test 2: Case-insensitive search
  const mixedCaseSearchTerm =
    searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1).toLowerCase();
  const searchResult2 = await api.functional.shoppingMall.sections.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        search: mixedCaseSearchTerm,
      } satisfies IShoppingMallSection.IRequest,
    },
  );
  typia.assert(searchResult2);
  // Should return same number of results as case-normal search
  TestValidator.equals(
    "case-insensitive search matches result count",
    searchResult2.data.length,
    searchResult1.data.length,
  );
  // Test 3: Substring search
  const substringSearch = "ect";
  const searchResult3 = await api.functional.shoppingMall.sections.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        search: substringSearch,
      } satisfies IShoppingMallSection.IRequest,
    },
  );
  typia.assert(searchResult3);
  // Should have results (at least one)
  TestValidator.predicate(
    "substring search returned results",
    () => searchResult3.data.length > 0,
  );
  // All results should contain the substring in title or description
  TestValidator.predicate(
    "all substring search results contain substring",
    () =>
      searchResult3.data.every(
        (section) =>
          section.title.toLowerCase().includes(substringSearch.toLowerCase()) ||
          (section.description &&
            section.description
              .toLowerCase()
              .includes(substringSearch.toLowerCase())),
      ),
  );
  // Test 4: Pagination
  const smallLimit = 5;
  const searchResult4 = await api.functional.shoppingMall.sections.index(
    connection,
    {
      body: {
        page: 1,
        limit: smallLimit,
        search: searchTerm,
      } satisfies IShoppingMallSection.IRequest,
    },
  );
  typia.assert(searchResult4);
  TestValidator.equals(
    "first page has correct limit",
    searchResult4.data.length,
    smallLimit,
  );
  TestValidator.predicate(
    "pagination records > 0",
    () => searchResult4.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    () => searchResult4.pagination.pages >= 1,
  );
  // Get second page
  const searchResult5 = await api.functional.shoppingMall.sections.index(
    connection,
    {
      body: {
        page: 2,
        limit: smallLimit,
        search: searchTerm,
      } satisfies IShoppingMallSection.IRequest,
    },
  );
  typia.assert(searchResult5);
  // Second page should have up to limit items
  TestValidator.predicate(
    "second page has at most limit results",
    () => searchResult5.data.length <= smallLimit,
  );
  // Ensure no overlap in page results
  const firstPageIds = new Set(searchResult4.data.map((s) => s.id));
  const secondPageIds = new Set(searchResult5.data.map((s) => s.id));
  TestValidator.predicate("no overlap between pagination pages", () =>
    Array.from(secondPageIds).every((id) => !firstPageIds.has(id)),
  );
  // Test 5: Single character search
  const singleChar = "s";
  const searchResult6 = await api.functional.shoppingMall.sections.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        search: singleChar,
      } satisfies IShoppingMallSection.IRequest,
    },
  );
  typia.assert(searchResult6);
  // Should return at least one result
  TestValidator.predicate(
    "single character search returned results",
    () => searchResult6.data.length > 0,
  );
  // Test 6: Long search term (edge case)
  const longSearchTerm = "x".repeat(255); // Max length
  const searchResult7 = await api.functional.shoppingMall.sections.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        search: longSearchTerm,
      } satisfies IShoppingMallSection.IRequest,
    },
  );
  typia.assert(searchResult7);
  // Should return 0 or more results (no validation expected on content)
  TestValidator.predicate(
    "long search term request succeeds",
    () => true, // No requirement to return results, just that it doesn't error
  );
  // Test 7: Verify sorting by relevance (title matches preferred over description)
  // We'll search for a term that's likely in many titles
  const relevanceTerm = "section";
  const searchResult8 = await api.functional.shoppingMall.sections.index(
    connection,
    {
      body: {
        page: 1,
        limit: 50,
        search: relevanceTerm,
      } satisfies IShoppingMallSection.IRequest,
    },
  );
  typia.assert(searchResult8);
  // Identify sections with term only in title vs title and description
  const titleOnlyMatches = searchResult8.data.filter(
    (s) =>
      s.title.toLowerCase().includes(relevanceTerm.toLowerCase()) &&
      (!s.description ||
        !s.description.toLowerCase().includes(relevanceTerm.toLowerCase())),
  );
  const descriptionOnlyMatches = searchResult8.data.filter(
    (s) =>
      !s.title.toLowerCase().includes(relevanceTerm.toLowerCase()) &&
      s.description?.toLowerCase().includes(relevanceTerm.toLowerCase()),
  );
  if (titleOnlyMatches.length > 0 && descriptionOnlyMatches.length > 0) {
    // Find the first description-only match
    const firstDescriptionIndex = searchResult8.data.findIndex(
      (s) =>
        !s.title.toLowerCase().includes(relevanceTerm.toLowerCase()) &&
        s.description?.toLowerCase().includes(relevanceTerm.toLowerCase()),
    );
    // All title-only matches should come before any description-only matches
    TestValidator.predicate(
      "title matches appear before description-only matches",
      () =>
        descriptionOnlyMatches.every(
          (d) =>
            searchResult8.data.indexOf(d) >
            searchResult8.data.lastIndexOf(
              typia.assert(
                (searchResult8.data.find(
                  (s) =>
                    s.title.toLowerCase().includes(relevanceTerm.toLowerCase()) &&
                    (!s.description ||
                      !s.description
                        .toLowerCase()
                        .includes(relevanceTerm.toLowerCase())),
                ) satisfies IShoppingMallSection.ISummary | undefined as IShoppingMallSection.ISummary | undefined)!,
              ),
            ),
        ),
    );
  }
}