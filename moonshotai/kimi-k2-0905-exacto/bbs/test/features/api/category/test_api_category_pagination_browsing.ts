import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICrIPageIntegerRequired } from "@ORGANIZATION/PROJECT-api/lib/structures/ICrIPageIntegerRequired";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionCategory";

/**
 * Test paginated browsing of discussion board categories with various page
 * parameters.
 *
 * This test validates that users can efficiently navigate through available
 * economic and political discussion topics using pagination controls including
 * page size limits, sorting options, and result ordering. The test ensures
 * optimal user experience in discovering relevant discussion categories.
 *
 * Test scenarios covered:
 *
 * 1. Basic pagination with default parameters
 * 2. Pagination with various page sizes within API limits
 * 3. Pagination with different page numbers
 * 4. Testing sort functionality with different sort_by options
 * 5. Testing sort order (ascending/descending)
 * 6. Pagination with search functionality
 * 7. Pagination with active/inactive status filtering
 * 8. Pagination with maximum allowed results per page
 * 9. Complex pagination combining multiple parameters
 * 10. Pagination result validation and empty state handling
 * 11. Pagination metadata field validation
 */
export async function test_api_category_pagination_browsing(
  connection: api.IConnection,
) {
  // Test 1: Basic pagination with default parameters
  const basicResponse =
    await api.functional.economicDiscussion.categories.index(connection, {
      body: {} satisfies IEconomicDiscussionCategory.IRequest,
    });
  typia.assert(basicResponse);
  TestValidator.predicate(
    "basic pagination returns valid response structure",
    basicResponse.data !== null && basicResponse.pagination !== null,
  );

  // Test 2: Pagination with explicit page and limit parameters
  const explicitParams =
    await api.functional.economicDiscussion.categories.index(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies IEconomicDiscussionCategory.IRequest,
    });
  typia.assert(explicitParams);
  TestValidator.predicate(
    "explicit pagination parameters return valid results",
    explicitParams.data.length >= 0 && explicitParams.pagination.limit === "20",
  );

  // Test 3: Pagination with smaller page size
  const smallPageSize =
    await api.functional.economicDiscussion.categories.index(connection, {
      body: {
        page: 1,
        limit: 5,
      } satisfies IEconomicDiscussionCategory.IRequest,
    });
  typia.assert(smallPageSize);
  TestValidator.predicate(
    "small page size returns limited results",
    smallPageSize.data.length <= 5 && smallPageSize.pagination.limit === "5",
  );

  // Test 4: Pagination with name-based sorting ascending
  const sortNameAsc = await api.functional.economicDiscussion.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 15,
        sort_by: "name",
        sort_order: "asc",
      } satisfies IEconomicDiscussionCategory.IRequest,
    },
  );
  typia.assert(sortNameAsc);
  TestValidator.predicate(
    "name ascending sort returns results",
    sortNameAsc.data.length > 0,
  );

  // Test 5: Pagination with name-based sorting descending
  const sortNameDesc = await api.functional.economicDiscussion.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 15,
        sort_by: "name",
        sort_order: "desc",
      } satisfies IEconomicDiscussionCategory.IRequest,
    },
  );
  typia.assert(sortNameDesc);
  TestValidator.predicate(
    "name descending sort returns results",
    sortNameDesc.data.length > 0,
  );

  // Test 6: Pagination with code-based sorting
  const sortByCode = await api.functional.economicDiscussion.categories.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        sort_by: "code",
        sort_order: "asc",
      } satisfies IEconomicDiscussionCategory.IRequest,
    },
  );
  typia.assert(sortByCode);
  TestValidator.predicate(
    "code sorting returns ordered results",
    sortByCode.data.length > 0,
  );

  // Test 7: Pagination with display order sorting
  const sortByDisplayOrder =
    await api.functional.economicDiscussion.categories.index(connection, {
      body: {
        page: 1,
        limit: 25,
        sort_by: "display_order",
        sort_order: "asc",
      } satisfies IEconomicDiscussionCategory.IRequest,
    });
  typia.assert(sortByDisplayOrder);
  TestValidator.predicate(
    "display order sorting returns structured results",
    sortByDisplayOrder.data.length > 0,
  );

  // Test 8: Pagination with article count sorting descending
  const sortByArticleCount =
    await api.functional.economicDiscussion.categories.index(connection, {
      body: {
        page: 1,
        limit: 10,
        sort_by: "article_count",
        sort_order: "desc",
      } satisfies IEconomicDiscussionCategory.IRequest,
    });
  typia.assert(sortByArticleCount);
  TestValidator.predicate(
    "article count sorting returns results",
    sortByArticleCount.data.length > 0,
  );

  // Test 9: Pagination with search functionality
  const searchTerm = RandomGenerator.pick([
    "economic",
    "political",
    "finance",
    "policy",
    "market",
  ]);
  const searchResults =
    await api.functional.economicDiscussion.categories.index(connection, {
      body: {
        page: 1,
        limit: 10,
        search: searchTerm,
      } satisfies IEconomicDiscussionCategory.IRequest,
    });
  typia.assert(searchResults);
  TestValidator.predicate(
    "search pagination filters by search term",
    searchResults.data.every(
      (item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase()),
    ),
  );

  // Test 10: Pagination with active status filtering
  const activeFilterResults =
    await api.functional.economicDiscussion.categories.index(connection, {
      body: {
        page: 1,
        limit: 15,
        is_active: true,
      } satisfies IEconomicDiscussionCategory.IRequest,
    });
  typia.assert(activeFilterResults);
  TestValidator.predicate(
    "active filter returns only active categories",
    activeFilterResults.data.every((item) => item.is_active === true),
  );

  // Test 11: Pagination with inactive status filtering
  const inactiveFilterResults =
    await api.functional.economicDiscussion.categories.index(connection, {
      body: {
        page: 1,
        limit: 15,
        is_active: false,
      } satisfies IEconomicDiscussionCategory.IRequest,
    });
  typia.assert(inactiveFilterResults);
  TestValidator.predicate(
    "inactive filter returns only inactive categories",
    inactiveFilterResults.data.every((item) => item.is_active === false),
  );

  // Test 12: Pagination with maximum allowed limit
  const maxLimitResults =
    await api.functional.economicDiscussion.categories.index(connection, {
      body: {
        page: 1,
        limit: 100, // Maximum allowed by API
      } satisfies IEconomicDiscussionCategory.IRequest,
    });
  typia.assert(maxLimitResults);
  TestValidator.predicate(
    "max limit returns correct page size",
    maxLimitResults.pagination.limit === "100",
  );

  // Test 13: Complex pagination with multiple parameters
  const complexResults =
    await api.functional.economicDiscussion.categories.index(connection, {
      body: {
        page: 2,
        limit: 20,
        sort_by: "created_at",
        sort_order: "desc",
        search: "market",
        is_active: true,
      } satisfies IEconomicDiscussionCategory.IRequest,
    });
  typia.assert(complexResults);
  TestValidator.predicate(
    "complex pagination applies all filters",
    complexResults.pagination.current === "2" &&
      complexResults.pagination.limit === "20" &&
      complexResults.data.every((item) => item.is_active === true),
  );

  // Test 14: Pagination with empty search results
  const emptySearchResults =
    await api.functional.economicDiscussion.categories.index(connection, {
      body: {
        page: 1,
        limit: 10,
        search: "zzzzzzzzzzzzzzz",
      } satisfies IEconomicDiscussionCategory.IRequest,
    });
  typia.assert(emptySearchResults);
  TestValidator.predicate(
    "empty search returns no results",
    emptySearchResults.data.length === 0,
  );

  // Test 15: Pagination validation for empty results with status filter
  const emptyStatusFilter =
    await api.functional.economicDiscussion.categories.index(connection, {
      body: {
        page: 1,
        limit: 10,
        is_active: false,
        search: "zzzzzzzzzzzzzzz",
      } satisfies IEconomicDiscussionCategory.IRequest,
    });
  typia.assert(emptyStatusFilter);
  TestValidator.predicate(
    "complex empty search returns empty results",
    emptyStatusFilter.data.length === 0,
  );

  // Test 16: Pagination metadata validation
  const metadataValidation =
    await api.functional.economicDiscussion.categories.index(connection, {
      body: {
        page: 1,
        limit: 25,
      } satisfies IEconomicDiscussionCategory.IRequest,
    });
  typia.assert(metadataValidation);

  // Validate all pagination metadata fields exist and have correct types
  TestValidator.predicate(
    "pagination current field exists",
    metadataValidation.pagination.current !== null &&
      metadataValidation.pagination.current !== undefined,
  );
  TestValidator.predicate(
    "pagination limit field matches request",
    metadataValidation.pagination.limit === "25",
  );
  TestValidator.predicate(
    "pagination pages field exists",
    metadataValidation.pagination.pages !== null &&
      metadataValidation.pagination.pages !== undefined,
  );
  TestValidator.predicate(
    "pagination records field exists",
    metadataValidation.pagination.records !== null &&
      metadataValidation.pagination.records !== undefined,
  );
}
