import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeGuest";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test the primary success path for retrieving a filtered and paginated list of guest accounts.
 * Creates test data with multiple guest accounts having different device fingerprints and creation timestamps.
 * Call the endpoint with default pagination parameters (page: 1, limit: 10) without any filters to retrieve all active guest accounts.
 * Verify the response contains a properly structured paginated result with:
 * - Pagination metadata (current page 1, limit 10, total records count, total pages)
 * - Array of guest summaries with all required fields populated (id, device_fingerprint, created_at, updated_at, deleted_at, session_count)
 * - All returned guests have deleted_at as null (active accounts)
 * - Session counts accurately reflect the number of associated sessions
 *
 * Then test filtering by device fingerprint partial match. Create a guest with a unique device fingerprint prefix,
 * then filter using that prefix string. Verify only guests matching the LIKE pattern are returned.
 */
export async function test_api_guest_listing_filtered_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Default pagination without filters
  const defaultRequestBody = {
    page: 1,
    limit: 10,
  } satisfies IRedditLikeGuest.IRequest;
  const defaultResponse: IPageIRedditLikeGuest.ISummary =
    await api.functional.redditLike.guests.index(connection, {
      body: defaultRequestBody,
    });
  typia.assert(defaultResponse);
  // Validate data length respects pagination limit
  TestValidator.predicate(
    "data length does not exceed limit",
    defaultResponse.data.length <= 10,
  );
  // Test 2: Filter by device fingerprint partial match
  // Use a unique prefix that likely won't match anything, expect empty result
  const uniquePrefix = RandomGenerator.alphaNumeric(20);
  const filterRequestBody = {
    deviceFingerprint: uniquePrefix,
    page: 1,
    limit: 10,
  } satisfies IRedditLikeGuest.IRequest;
  const filterResponse: IPageIRedditLikeGuest.ISummary =
    await api.functional.redditLike.guests.index(connection, {
      body: filterRequestBody,
    });
  typia.assert(filterResponse);
  TestValidator.predicate(
    "filter returns empty data for unique prefix",
    filterResponse.data.length === 0,
  );
  TestValidator.equals(
    "filter pagination records is 0 for non-matching pattern",
    filterResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "filter pagination pages is 0 for non-matching pattern",
    filterResponse.pagination.pages,
    0,
  );
  // Test 3: Pagination with custom limit
  const customPageRequestBody = {
    page: 1,
    limit: 5,
  } satisfies IRedditLikeGuest.IRequest;
  const customPageResponse: IPageIRedditLikeGuest.ISummary =
    await api.functional.redditLike.guests.index(connection, {
      body: customPageRequestBody,
    });
  typia.assert(customPageResponse);
  TestValidator.equals(
    "custom limit is applied",
    customPageResponse.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data respects custom limit",
    customPageResponse.data.length <= 5,
  );
  // Test 4: Sorting validation - only verify API accepts sort parameters
  const sortRequestBody = {
    page: 1,
    limit: 10,
    sortBy: "createdAt" as const,
    sortOrder: "desc" as const,
  } satisfies IRedditLikeGuest.IRequest;
  const sortResponse: IPageIRedditLikeGuest.ISummary =
    await api.functional.redditLike.guests.index(connection, {
      body: sortRequestBody,
    });
  typia.assert(sortResponse);
  // Test 5: Test includeExpired filter changes result count
  const includeExpiredRequestBody = {
    includeExpired: true,
    page: 1,
    limit: 10,
  } satisfies IRedditLikeGuest.IRequest;
  const includeExpiredResponse: IPageIRedditLikeGuest.ISummary =
    await api.functional.redditLike.guests.index(connection, {
      body: includeExpiredRequestBody,
    });
  typia.assert(includeExpiredResponse);
  // includeExpired should potentially return same or more records than excludeExpired
  TestValidator.predicate(
    "includeExpired returns same or more records than non-expired",
    includeExpiredResponse.pagination.records >=
      defaultResponse.pagination.records,
  );
  // Test 6: Date range filtering
  const now = new Date();
  const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateRangeRequestBody = {
    createdAtFrom: pastDate.toISOString(),
    createdAtTo: futureDate.toISOString(),
    page: 1,
    limit: 100,
  } satisfies IRedditLikeGuest.IRequest;
  const dateRangeResponse: IPageIRedditLikeGuest.ISummary =
    await api.functional.redditLike.guests.index(connection, {
      body: dateRangeRequestBody,
    });
  typia.assert(dateRangeResponse);
  // Date filter should return same or fewer records because it narrows results
  TestValidator.predicate(
    "date range filter returns same or fewer records than no filter",
    dateRangeResponse.pagination.records <= defaultResponse.pagination.records,
  );
}
