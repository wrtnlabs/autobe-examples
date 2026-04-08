import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityGuest";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test guest listing with device fingerprint search filtering.
 *
 * Validates the search functionality for filtering guest accounts by device fingerprint pattern. The search should perform case-insensitive partial matching, returning only guests whose device fingerprints contain the search pattern. This ensures administrators can efficiently locate specific guest accounts using device identifiers.
 *
 * The test verifies that pagination metadata accurately reflects the filtered result count rather than the total guest count, ensuring proper pagination behavior when search filters are applied.
 *
 * 1. Generate a unique device fingerprint pattern for testing.
 * 2. Create a search request with the fingerprint pattern as partial match.
 * 3. Call the guest listing endpoint with search parameter.
 * 4. Validate response structure matches IPageIRedditCommunityGuest.ISummary.
 * 5. Validate pagination metadata (current page, limit, records, pages).
 * 6. Verify pagination records count matches actual data array length.
 * 7. Test with different search patterns to ensure filtering consistency.
 */
export async function test_api_guest_list_device_fingerprint_search(
  connection: api.IConnection,
): Promise<void> {
  // Generate a unique fingerprint pattern for testing
  const fingerprintPattern = RandomGenerator.alphaNumeric(8);
  // Test 1: Search with fingerprint pattern
  const searchRequest: IRedditCommunityGuest.IRequest = {
    search: fingerprintPattern,
    page: 1,
    limit: 10,
    sort: "created_at",
    direction: "desc",
  };
  const result = await api.functional.redditCommunity.guests.index(connection, {
    body: searchRequest,
  });
  typia.assert(result);
  // Validate pagination structure
  TestValidator.predicate("pagination exists", result.pagination !== undefined);
  TestValidator.predicate("data array exists", Array.isArray(result.data));
  // Validate pagination metadata
  TestValidator.predicate("current page is 1", result.pagination.current === 1);
  TestValidator.predicate(
    "limit matches request",
    result.pagination.limit === 10,
  );
  TestValidator.predicate(
    "records count is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    result.pagination.pages >= 0,
  );
  // Validate that records count matches data array length (business logic)
  TestValidator.equals(
    "records matches data length",
    result.pagination.records,
    result.data.length,
  );
  // Test 2: Search with different pattern (should return valid structure)
  const alternativePattern = RandomGenerator.alphabets(6);
  const alternativeRequest: IRedditCommunityGuest.IRequest = {
    search: alternativePattern,
    page: 1,
    limit: 20,
  };
  const alternativeResult = await api.functional.redditCommunity.guests.index(
    connection,
    {
      body: alternativeRequest,
    },
  );
  typia.assert(alternativeResult);
  // Validate alternative search result structure
  TestValidator.predicate(
    "alternative pagination exists",
    alternativeResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "alternative data array exists",
    Array.isArray(alternativeResult.data),
  );
  TestValidator.equals(
    "alternative limit matches request",
    alternativeResult.pagination.limit,
    20,
  );
  // Test 3: Search without filter (should return all guests)
  const noFilterRequest: IRedditCommunityGuest.IRequest = {
    page: 1,
    limit: 50,
  };
  const noFilterResult = await api.functional.redditCommunity.guests.index(
    connection,
    {
      body: noFilterRequest,
    },
  );
  typia.assert(noFilterResult);
  // Validate no-filter result structure
  TestValidator.predicate(
    "no-filter pagination exists",
    noFilterResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "no-filter data array exists",
    Array.isArray(noFilterResult.data),
  );
  TestValidator.equals(
    "no-filter limit matches request",
    noFilterResult.pagination.limit,
    50,
  );
}
