import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIPoliticsBbsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPoliticsBbsCategory";
import type { IPoliticsBbsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsCategory";

/**
 * Test category filtering by primary status for political discussion platform.
 *
 * This test validates the filtering API that allows users to show only primary
 * categories for featured content browsing. Since the system only provides
 * category retrieval functionality, the test focuses on validating that
 * filtering parameters are properly accepted and the API response structure is
 * correct for different primary filter values.
 *
 * Test flow:
 *
 * 1. Test filtering with primary=true to validate API accepts the parameter
 * 2. Test filtering with primary=false to validate API accepts the parameter
 * 3. Test filtering with primary=null to validate API accepts the parameter
 * 4. Validate response structure for all filtering scenarios
 * 5. Ensure pagination works correctly with filtering parameters
 * 6. Verify search functionality works with primary filters
 */
export async function test_api_categories_search_filter_primary(
  connection: api.IConnection,
) {
  // Test primary categories filtering (primary: true)
  const primaryRequest = {
    search: "",
    primary: true,
    limit: 20,
    page: 1,
    order_by: "sequence" as const,
    direction: "asc" as const,
  } satisfies IPoliticsBbsCategory.IRequest;

  const primaryCategories = await api.functional.politicsBbs.categories.index(
    connection,
    {
      body: primaryRequest,
    },
  );
  typia.assert(primaryCategories);

  // Validate response structure and pagination
  TestValidator.predicate(
    "primary categories response has valid pagination structure",
    primaryCategories.pagination !== null &&
      primaryCategories.pagination !== undefined,
  );
  TestValidator.predicate(
    "primary categories response has current page >= 1",
    primaryCategories.pagination.current >= 1,
  );
  TestValidator.predicate(
    "primary categories response has valid limit",
    primaryCategories.pagination.limit >= 1 &&
      primaryCategories.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "primary categories data is an array",
    Array.isArray(primaryCategories.data),
  );

  // Test secondary categories filtering (primary: false)
  const secondaryRequest = {
    search: "",
    primary: false,
    limit: 20,
    page: 1,
    order_by: "sequence" as const,
    direction: "asc" as const,
  } satisfies IPoliticsBbsCategory.IRequest;

  const secondaryCategories = await api.functional.politicsBbs.categories.index(
    connection,
    {
      body: secondaryRequest,
    },
  );
  typia.assert(secondaryCategories);

  // Validate response structure
  TestValidator.predicate(
    "secondary categories response has valid pagination structure",
    secondaryCategories.pagination !== null &&
      secondaryCategories.pagination !== undefined,
  );

  // Test all categories filtering (primary: null)
  const allRequest = {
    search: "",
    primary: null,
    limit: 20,
    page: 1,
    order_by: "sequence" as const,
    direction: "asc" as const,
  } satisfies IPoliticsBbsCategory.IRequest;

  const allCategories = await api.functional.politicsBbs.categories.index(
    connection,
    {
      body: allRequest,
    },
  );
  typia.assert(allCategories);

  // Validate that all requests successfully return responses
  TestValidator.predicate(
    "all categories response has valid pagination structure",
    allCategories.pagination !== null && allCategories.pagination !== undefined,
  );

  // Test search functionality with primary filter
  const searchRequest = {
    search: RandomGenerator.alphabets(5),
    primary: true,
    limit: 10,
    page: 1,
    order_by: "name" as const,
    direction: "desc" as const,
  } satisfies IPoliticsBbsCategory.IRequest;

  const searchCategories = await api.functional.politicsBbs.categories.index(
    connection,
    {
      body: searchRequest,
    },
  );
  typia.assert(searchCategories);

  // Validate search results structure
  TestValidator.predicate(
    "search with primary filter returns valid data structure",
    Array.isArray(searchCategories.data),
  );
}
