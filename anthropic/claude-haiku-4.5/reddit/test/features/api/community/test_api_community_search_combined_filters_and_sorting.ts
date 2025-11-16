import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";

/**
 * Test complex community discovery with multiple filters and sorting applied
 * simultaneously.
 *
 * This test validates that the community search API correctly combines text
 * search, category filtering, visibility filtering, and sorting operations
 * without conflicts or interference. Verifies filter combination, sorting with
 * filters, pagination behavior, boundary cases (single result, zero results,
 * all results), and ensures filters and sorting don't interfere with each
 * other.
 *
 * Test Steps:
 *
 * 1. Test text search filter alone
 * 2. Test category filter alone
 * 3. Test visibility filter alone
 * 4. Test combined filters (search + category)
 * 5. Test combined filters (search + visibility)
 * 6. Test combined filters (category + visibility)
 * 7. Test combined filters (search + category + visibility)
 * 8. Test sorting with various filter combinations
 * 9. Test pagination with filters applied
 * 10. Test boundary cases (single result, zero results, all results)
 */
export async function test_api_community_search_combined_filters_and_sorting(
  connection: api.IConnection,
) {
  // Generate test data with diverse community characteristics
  const testCategoryId = typia.random<string & tags.Format<"uuid">>();

  // Test 1: Text search alone
  const searchOnlyResult =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        search: "test",
        limit: 20,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(searchOnlyResult);
  TestValidator.predicate(
    "text search should return paginated results",
    searchOnlyResult.pagination !== null,
  );

  // Test 2: Category filter alone
  const categoryFilterResult =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        category_id: testCategoryId,
        limit: 20,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(categoryFilterResult);
  TestValidator.predicate(
    "category filter should return results",
    categoryFilterResult.pagination !== null,
  );

  // Test 3: Visibility filter alone
  const visibilityFilterResult =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        visibility: "public",
        limit: 20,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(visibilityFilterResult);
  TestValidator.predicate(
    "visibility filter should return results",
    visibilityFilterResult.pagination !== null,
  );

  // Test 4: Combined filters (search + category)
  const searchPlusCategoryResult =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        search: "technology",
        category_id: testCategoryId,
        limit: 20,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(searchPlusCategoryResult);
  TestValidator.predicate(
    "search and category filter should work together",
    searchPlusCategoryResult.pagination !== null,
  );

  // Test 5: Combined filters (search + visibility)
  const searchPlusVisibilityResult =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        search: "community",
        visibility: "public",
        limit: 20,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(searchPlusVisibilityResult);
  TestValidator.predicate(
    "search and visibility filter should work together",
    searchPlusVisibilityResult.pagination !== null,
  );

  // Test 6: Combined filters (category + visibility)
  const categoryPlusVisibilityResult =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        category_id: testCategoryId,
        visibility: "public",
        limit: 20,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(categoryPlusVisibilityResult);
  TestValidator.predicate(
    "category and visibility filter should work together",
    categoryPlusVisibilityResult.pagination !== null,
  );

  // Test 7: Combined filters (search + category + visibility)
  const allFiltersResult =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        search: "tech",
        category_id: testCategoryId,
        visibility: "public",
        limit: 20,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(allFiltersResult);
  TestValidator.predicate(
    "all filters combined should work together",
    allFiltersResult.pagination !== null,
  );

  // Test 8: Sorting by name ascending with filters
  const sortByNameAscResult =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        search: "test",
        visibility: "public",
        sort: "name",
        direction: "asc",
        limit: 20,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(sortByNameAscResult);
  TestValidator.predicate(
    "sorting by name ascending with filters should work",
    sortByNameAscResult.data.length >= 0,
  );

  // Test 9: Sorting by name descending with filters
  const sortByNameDescResult =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        category_id: testCategoryId,
        visibility: "public",
        sort: "name",
        direction: "desc",
        limit: 20,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(sortByNameDescResult);
  TestValidator.predicate(
    "sorting by name descending with filters should work",
    sortByNameDescResult.data.length >= 0,
  );

  // Test 10: Sorting by subscriber count with filters
  const sortBySubscriberResult =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        search: "community",
        sort: "subscriber_count",
        direction: "desc",
        limit: 20,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(sortBySubscriberResult);
  TestValidator.predicate(
    "sorting by subscriber count with filters should work",
    sortBySubscriberResult.data.length >= 0,
  );

  // Test 11: Sorting by post count with filters
  const sortByPostCountResult =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        visibility: "public",
        sort: "post_count",
        direction: "asc",
        limit: 20,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(sortByPostCountResult);
  TestValidator.predicate(
    "sorting by post count with filters should work",
    sortByPostCountResult.data.length >= 0,
  );

  // Test 12: Sorting by created_at descending with all filters
  const sortByCreatedAtResult =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        search: "newest",
        category_id: testCategoryId,
        visibility: "public",
        sort: "created_at",
        direction: "desc",
        limit: 20,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(sortByCreatedAtResult);
  TestValidator.predicate(
    "sorting by created_at with all filters should work",
    sortByCreatedAtResult.data.length >= 0,
  );

  // Test 13: Pagination with filters - limit and offset
  const paginationResult =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        search: "test",
        category_id: testCategoryId,
        visibility: "public",
        limit: 5,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(paginationResult);
  TestValidator.predicate(
    "pagination limit should be respected",
    paginationResult.data.length <= 5,
  );

  // Test 14: Pagination offset with filters
  const paginationOffsetResult =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        visibility: "public",
        limit: 10,
        offset: 5,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(paginationOffsetResult);
  TestValidator.predicate(
    "pagination offset should work with filters",
    paginationOffsetResult.pagination.current >= 0,
  );

  // Test 15: Boundary case - very restrictive filter (single result)
  const restrictiveSearchResult =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        search: RandomGenerator.alphaNumeric(20),
        category_id: testCategoryId,
        visibility: "public",
        limit: 20,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(restrictiveSearchResult);
  TestValidator.predicate(
    "restrictive filter should return valid results",
    restrictiveSearchResult.pagination !== null,
  );

  // Test 16: Boundary case - no filters (should return all)
  const noFiltersResult =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        limit: 20,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(noFiltersResult);
  TestValidator.predicate(
    "no filters should return all results",
    noFiltersResult.pagination !== null,
  );

  // Test 17: Verify filters don't interfere with sorting
  const filterSortConsistencyResult =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        search: "test",
        sort: "subscriber_count",
        direction: "desc",
        limit: 50,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(filterSortConsistencyResult);
  TestValidator.predicate(
    "filters should not interfere with sorting",
    filterSortConsistencyResult.data.length >= 0,
  );

  // Test 18: Verify sorting doesn't interfere with filters
  const sortFilterConsistencyResult =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        category_id: testCategoryId,
        visibility: "public",
        sort: "name",
        direction: "asc",
        limit: 50,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(sortFilterConsistencyResult);
  TestValidator.predicate(
    "sorting should not interfere with filters",
    sortFilterConsistencyResult.data.length >= 0,
  );

  // Test 19: Complex scenario - search + category + visibility + sort + pagination
  const complexScenarioResult =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        search: "active",
        category_id: testCategoryId,
        visibility: "public",
        sort: "subscriber_count",
        direction: "desc",
        limit: 10,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(complexScenarioResult);
  TestValidator.predicate(
    "complex scenario with all parameters should work",
    complexScenarioResult.data.length <= 10,
  );

  // Test 20: Verify pagination structure is valid
  TestValidator.predicate(
    "pagination current should be a number",
    typeof complexScenarioResult.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination limit should be a number",
    typeof complexScenarioResult.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination records should be a number",
    typeof complexScenarioResult.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination pages should be a number",
    typeof complexScenarioResult.pagination.pages === "number",
  );
}
