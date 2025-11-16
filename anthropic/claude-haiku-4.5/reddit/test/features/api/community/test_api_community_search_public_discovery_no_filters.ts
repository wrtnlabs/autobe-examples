import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";

/**
 * Test basic community discovery with no filters applied.
 *
 * This test validates the public community discovery API by searching for
 * communities without applying any filters. It verifies that the API returns a
 * paginated list of public communities with correct summary information and
 * proper pagination metadata.
 *
 * Test flow:
 *
 * 1. Execute community search with empty filter criteria (no search, no visibility
 *    filter, no category filter)
 * 2. Validate response contains paginated list of public communities
 * 3. Verify pagination metadata is present and consistent
 * 4. Validate default pagination behavior (default page size of 20)
 * 5. Confirm returned data respects pagination limits
 * 6. Verify pagination math (current page, limit, total records, total pages
 *    consistency)
 */
export async function test_api_community_search_public_discovery_no_filters(
  connection: api.IConnection,
) {
  // Execute community search with no filters to discover all public communities
  const response = await api.functional.communityPlatform.communities.index(
    connection,
    {
      body: {} satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(response);

  // Validate response structure contains pagination and data
  TestValidator.predicate(
    "response contains pagination metadata",
    response.pagination !== undefined && response.pagination !== null,
  );
  TestValidator.predicate(
    "response contains data array",
    Array.isArray(response.data),
  );

  // Validate pagination metadata properties
  const pagination = response.pagination;
  TestValidator.predicate(
    "pagination current page is zero or positive",
    pagination.current >= 0,
  );
  TestValidator.predicate("pagination limit is positive", pagination.limit > 0);
  TestValidator.predicate(
    "pagination total records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination total pages is non-negative",
    pagination.pages >= 0,
  );

  // Validate default pagination behavior (default page size should be 20)
  TestValidator.equals(
    "pagination limit defaults to 20 per page",
    pagination.limit,
    20,
  );

  // Validate data consistency with pagination
  TestValidator.predicate(
    "returned data count does not exceed limit",
    response.data.length <= pagination.limit,
  );

  // Validate pagination math
  TestValidator.predicate(
    "if total records is 0, data array should be empty",
    pagination.records === 0 ? response.data.length === 0 : true,
  );

  // Validate pagination page count is correct (ceiling division)
  const expectedPages =
    pagination.records === 0
      ? 0
      : Math.ceil(pagination.records / pagination.limit);
  TestValidator.equals(
    "total pages is correct based on records and limit",
    pagination.pages,
    expectedPages,
  );

  // If data exists, validate non-empty communities were returned
  if (response.data.length > 0) {
    TestValidator.predicate(
      "at least one community returned in results",
      response.data.length > 0,
    );
    TestValidator.predicate(
      "total records count matches or exceeds returned data",
      pagination.records >= response.data.length,
    );
  }
}
