import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCategory";

/**
 * Test category search when no categories match the specified criteria.
 *
 * Validates proper handling of empty result sets and appropriate pagination
 * metadata. Tests edge cases where search parameters yield zero results and
 * ensures graceful handling of empty responses.
 */
export async function test_api_community_category_search_empty_results(
  connection: api.IConnection,
) {
  // Generate a realistic random community slug that likely doesn't exist
  const communitySlug = RandomGenerator.alphaNumeric(15).toLowerCase();

  // Test scenario 1: Search with unique term that won't match anything
  const uniqueSearchCriteria = {
    search: RandomGenerator.alphabets(25), // Highly unique search term
    page: 1,
    limit: 10,
    status: "active",
    is_active: true,
    order_by: "name",
    order_direction: "asc",
  } satisfies ICommunityPlatformCategory.IRequest;

  const result1: IPageICommunityPlatformCategory.ISummary =
    await api.functional.communityPlatform.communities.categories.index(
      connection,
      {
        communitySlug,
        body: uniqueSearchCriteria,
      },
    );

  typia.assert(result1);

  // Validate pagination metadata for empty results
  TestValidator.equals(
    "pagination current page should be 1 for unique search",
    result1.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination limit should match request for unique search",
    result1.pagination.limit,
    uniqueSearchCriteria.limit,
  );

  TestValidator.equals(
    "total records should be 0 for unique search results",
    result1.pagination.records,
    0,
  );

  TestValidator.equals(
    "total pages should be 0 for unique search results",
    result1.pagination.pages,
    0,
  );

  TestValidator.equals(
    "data array should be empty for unique search",
    result1.data,
    [],
  );

  // Test scenario 2: Search with specific status that doesn't exist
  const statusSearchCriteria = {
    search: undefined,
    page: 1,
    limit: 5,
    status: "suspended", // Assuming no suspended categories exist
    is_active: false,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies ICommunityPlatformCategory.IRequest;

  const result2: IPageICommunityPlatformCategory.ISummary =
    await api.functional.communityPlatform.communities.categories.index(
      connection,
      {
        communitySlug,
        body: statusSearchCriteria,
      },
    );

  typia.assert(result2);

  TestValidator.equals(
    "pagination current page should be 1 for status search",
    result2.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination limit should match request for status search",
    result2.pagination.limit,
    statusSearchCriteria.limit,
  );

  TestValidator.equals(
    "total records should be 0 for status search results",
    result2.pagination.records,
    0,
  );

  TestValidator.equals(
    "total pages should be 0 for status search results",
    result2.pagination.pages,
    0,
  );

  TestValidator.equals(
    "data array should be empty for status search",
    result2.data,
    [],
  );

  // Test scenario 3: Search with inactive categories filter
  const inactiveSearchCriteria = {
    search: undefined,
    page: 2, // Test pagination beyond first page
    limit: 20,
    status: undefined,
    is_active: false, // Assuming no inactive categories exist
    order_by: "sort_order",
    order_direction: "asc",
  } satisfies ICommunityPlatformCategory.IRequest;

  const result3: IPageICommunityPlatformCategory.ISummary =
    await api.functional.communityPlatform.communities.categories.index(
      connection,
      {
        communitySlug,
        body: inactiveSearchCriteria,
      },
    );

  typia.assert(result3);

  TestValidator.equals(
    "pagination current page should match request for inactive search",
    result3.pagination.current,
    inactiveSearchCriteria.page,
  );

  TestValidator.equals(
    "pagination limit should match request for inactive search",
    result3.pagination.limit,
    inactiveSearchCriteria.limit,
  );

  TestValidator.equals(
    "total records should be 0 for inactive search results",
    result3.pagination.records,
    0,
  );

  TestValidator.equals(
    "total pages should be 0 for inactive search results",
    result3.pagination.pages,
    0,
  );

  TestValidator.equals(
    "data array should be empty for inactive search",
    result3.data,
    [],
  );
}
