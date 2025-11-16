import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformTrendingCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTrendingCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformTrendingCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformTrendingCommunity";

/**
 * Test edge case when no trending communities are available.
 *
 * Validates that the trending communities endpoint handles empty result
 * scenarios gracefully. When the database contains no public communities or all
 * communities are deleted/private, the endpoint should return a successful
 * response with:
 *
 * - Empty data array (0 trending communities)
 * - Valid pagination metadata showing 0 total records and 0 total pages
 * - Proper response structure with pagination and data properties
 *
 * This test ensures that empty results do not cause errors and the response
 * structure remains valid and consistent with the API contract.
 */
export async function test_api_trending_communities_empty_results(
  connection: api.IConnection,
) {
  // Call the trending communities endpoint
  const response: IPageICommunityPlatformTrendingCommunity.ISummary =
    await api.functional.communityPlatform.trending.communities.index(
      connection,
    );

  // Validate complete response structure and all types
  typia.assert(response);

  // Verify pagination metadata is valid
  TestValidator.predicate(
    "pagination object should be present",
    response.pagination !== undefined && response.pagination !== null,
  );

  // Verify empty results - data array should be empty
  TestValidator.equals(
    "data array should be empty when no trending communities exist",
    response.data.length,
    0,
  );

  // Verify pagination consistency for empty results
  TestValidator.equals(
    "total records should be 0 for empty results",
    response.pagination.records,
    0,
  );

  TestValidator.equals(
    "total pages should be 0 when no records exist",
    response.pagination.pages,
    0,
  );

  // Verify pagination properties are valid numbers
  TestValidator.predicate(
    "current page should be non-negative",
    response.pagination.current >= 0,
  );

  TestValidator.predicate(
    "limit should be non-negative",
    response.pagination.limit >= 0,
  );

  // Verify response maintains expected structure
  TestValidator.predicate(
    "response should have both pagination and data properties",
    typeof response.pagination === "object" && Array.isArray(response.data),
  );
}
