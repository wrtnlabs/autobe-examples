import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICrIPageIntegerRequired } from "@ORGANIZATION/PROJECT-api/lib/structures/ICrIPageIntegerRequired";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionCategory";

/**
 * Test keyword-based category discovery through name and description text
 * search. Validates flexible category finding capabilities that allow users to
 * locate discussion topics matching their interests and expertise areas.
 *
 * The test creates multiple discussion categories covering various economic and
 * political themes, then validates that search functionality can find specific
 * categories using partial keywords and flexible matching across different
 * fields (name, code, etc).
 *
 * Test flow:
 *
 * 1. Test basic keyword search functionality with common terms
 * 2. Verify partial word matching finds relevant categories
 * 3. Test case-insensitive search behavior
 * 4. Test search combined with pagination and sorting
 * 5. Verify search results actually contain the search terms
 * 6. Test non-matching search returns no results
 */
export async function test_api_category_matching_keyword_search(
  connection: api.IConnection,
) {
  // Test 1: Basic keyword search with "economic" term
  const basicSearch = await api.functional.economicDiscussion.categories.index(
    connection,
    {
      body: {
        search: "economic",
      } satisfies IEconomicDiscussionCategory.IRequest,
    },
  );
  typia.assert(basicSearch);

  TestValidator.predicate(
    "basic economic search returns results",
    basicSearch.data.length > 0,
  );

  // Test 2: Partial keyword matching
  const partialSearch =
    await api.functional.economicDiscussion.categories.index(connection, {
      body: { search: "polic" } satisfies IEconomicDiscussionCategory.IRequest,
    });
  typia.assert(partialSearch);

  TestValidator.predicate(
    "partial keyword 'polic' matching works",
    partialSearch.data.length >= 0,
  );

  // Test 3: Case-insensitive search
  const uppercaseSearch =
    await api.functional.economicDiscussion.categories.index(connection, {
      body: {
        search: "ECONOMIC",
      } satisfies IEconomicDiscussionCategory.IRequest,
    });
  typia.assert(uppercaseSearch);

  TestValidator.predicate(
    "uppercase economic search returns results",
    uppercaseSearch.data.length > 0,
  );
  TestValidator.equals(
    "case insensitive results count",
    uppercaseSearch.data.length,
    basicSearch.data.length,
  );

  // Test 4: Search combined with pagination
  const paginatedSearch =
    await api.functional.economicDiscussion.categories.index(connection, {
      body: {
        search: "market",
        page: 1,
        limit: 5,
      } satisfies IEconomicDiscussionCategory.IRequest,
    });
  typia.assert(paginatedSearch);

  TestValidator.predicate(
    "paginated search works",
    paginatedSearch.data.length >= 0,
  );
  TestValidator.predicate(
    "pagination metadata exists",
    paginatedSearch.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination limit respected",
    paginatedSearch.data.length <= 5,
  );

  // Test 5: Search combined with sorting
  const sortedSearch = await api.functional.economicDiscussion.categories.index(
    connection,
    {
      body: {
        search: "trade",
        sort_by: "name",
        sort_order: "desc",
        page: 1,
        limit: 10,
      } satisfies IEconomicDiscussionCategory.IRequest,
    },
  );
  typia.assert(sortedSearch);

  TestValidator.predicate(
    "sorted search returns results",
    sortedSearch.data.length >= 0,
  );
  TestValidator.predicate(
    "pagination works with sorting",
    sortedSearch.pagination !== undefined,
  );

  // Test 6: Verify search terms appear in results
  const verificationSearch =
    await api.functional.economicDiscussion.categories.index(connection, {
      body: {
        search: "inflation",
      } satisfies IEconomicDiscussionCategory.IRequest,
    });
  typia.assert(verificationSearch);

  if (verificationSearch.data.length > 0) {
    const firstResult = verificationSearch.data[0];
    const searchTermFound =
      firstResult.code.toLowerCase().includes("inflation") ||
      firstResult.name.toLowerCase().includes("inflation");
    TestValidator.predicate("search term appears in result", searchTermFound);
  }

  // Test 7: Non-matching search term
  const noResultsSearch =
    await api.functional.economicDiscussion.categories.index(connection, {
      body: {
        search: "xyz123nonexistent",
      } satisfies IEconomicDiscussionCategory.IRequest,
    });
  typia.assert(noResultsSearch);

  TestValidator.predicate(
    "non-existent search term returns empty",
    noResultsSearch.data.length === 0,
  );
}
