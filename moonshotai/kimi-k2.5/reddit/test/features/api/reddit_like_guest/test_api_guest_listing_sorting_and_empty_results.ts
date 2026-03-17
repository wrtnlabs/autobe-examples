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
 * Test sorting functionality and empty results on the guest listing endpoint.
 * 1. Test sorting by different columns in both ascending and descending orders
 * 2. Test edge case with filters that result in no matching guests
 */
export async function test_api_guest_listing_sorting_and_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Test sorting by deviceFingerprint in ascending order
  const sortByDeviceAsc = await api.functional.redditLike.guests.index(
    connection,
    {
      body: {
        sortBy: "deviceFingerprint",
        sortOrder: "asc",
        limit: 10,
        page: 1,
      } satisfies IRedditLikeGuest.IRequest,
    },
  );
  typia.assert(sortByDeviceAsc);
  // Test sorting by deviceFingerprint in descending order
  const sortByDeviceDesc = await api.functional.redditLike.guests.index(
    connection,
    {
      body: {
        sortBy: "deviceFingerprint",
        sortOrder: "desc",
        limit: 10,
        page: 1,
      } satisfies IRedditLikeGuest.IRequest,
    },
  );
  typia.assert(sortByDeviceDesc);
  // Test sorting by createdAt in ascending order
  const sortByCreatedAtAsc = await api.functional.redditLike.guests.index(
    connection,
    {
      body: {
        sortBy: "createdAt",
        sortOrder: "asc",
        limit: 10,
        page: 1,
      } satisfies IRedditLikeGuest.IRequest,
    },
  );
  typia.assert(sortByCreatedAtAsc);
  // Test sorting by createdAt in descending order
  const sortByCreatedAtDesc = await api.functional.redditLike.guests.index(
    connection,
    {
      body: {
        sortBy: "createdAt",
        sortOrder: "desc",
        limit: 10,
        page: 1,
      } satisfies IRedditLikeGuest.IRequest,
    },
  );
  typia.assert(sortByCreatedAtDesc);
  // Test sorting by updatedAt in ascending order
  const sortByUpdatedAtAsc = await api.functional.redditLike.guests.index(
    connection,
    {
      body: {
        sortBy: "updatedAt",
        sortOrder: "asc",
        limit: 10,
        page: 1,
      } satisfies IRedditLikeGuest.IRequest,
    },
  );
  typia.assert(sortByUpdatedAtAsc);
  // Test sorting by updatedAt in descending order
  const sortByUpdatedAtDesc = await api.functional.redditLike.guests.index(
    connection,
    {
      body: {
        sortBy: "updatedAt",
        sortOrder: "desc",
        limit: 10,
        page: 1,
      } satisfies IRedditLikeGuest.IRequest,
    },
  );
  typia.assert(sortByUpdatedAtDesc);
  // Verify sorting works by comparing ASC vs DESC data
  if (sortByCreatedAtAsc.data.length > 1) {
    // Verify ascending order (earliest first)
    for (let i = 1; i < sortByCreatedAtAsc.data.length; i++) {
      const prev = new Date(
        sortByCreatedAtAsc.data[i - 1].created_at,
      ).getTime();
      const curr = new Date(sortByCreatedAtAsc.data[i].created_at).getTime();
      TestValidator.predicate("createdAt asc order", prev <= curr);
    }
  }
  if (sortByCreatedAtDesc.data.length > 1) {
    // Verify descending order (latest first)
    for (let i = 1; i < sortByCreatedAtDesc.data.length; i++) {
      const prev = new Date(
        sortByCreatedAtDesc.data[i - 1].created_at,
      ).getTime();
      const curr = new Date(sortByCreatedAtDesc.data[i].created_at).getTime();
      TestValidator.predicate("createdAt desc order", prev >= curr);
    }
  }
  // Test empty results with device fingerprint filter that matches no guests
  const nonExistentFingerprint = `nonexistent_${RandomGenerator.alphabets(20)}_fingerprint_${RandomGenerator.alphaNumeric(20)}`;
  const emptyByFingerprint = await api.functional.redditLike.guests.index(
    connection,
    {
      body: {
        deviceFingerprint: nonExistentFingerprint,
        limit: 10,
        page: 1,
      } satisfies IRedditLikeGuest.IRequest,
    },
  );
  typia.assert(emptyByFingerprint);
  // Verify empty result structure
  TestValidator.equals(
    "empty fingerprint data length",
    emptyByFingerprint.data.length,
    0,
  );
  TestValidator.equals(
    "empty fingerprint pagination current",
    emptyByFingerprint.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty fingerprint pagination limit",
    emptyByFingerprint.pagination.limit,
    10,
  );
  TestValidator.equals(
    "empty fingerprint pagination records",
    emptyByFingerprint.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty fingerprint pagination pages",
    emptyByFingerprint.pagination.pages,
    0,
  );
  // Test empty results with future date filter (no guests could exist in future)
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 100); // 100 years in future
  const futureIsoString = futureDate.toISOString();
  const emptyByFutureDate = await api.functional.redditLike.guests.index(
    connection,
    {
      body: {
        createdAtFrom: futureIsoString,
        limit: 10,
        page: 1,
      } satisfies IRedditLikeGuest.IRequest,
    },
  );
  typia.assert(emptyByFutureDate);
  // Verify empty result structure for future date
  TestValidator.equals(
    "empty future date data length",
    emptyByFutureDate.data.length,
    0,
  );
  TestValidator.equals(
    "empty future date pagination current",
    emptyByFutureDate.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty future date pagination limit",
    emptyByFutureDate.pagination.limit,
    10,
  );
  TestValidator.equals(
    "empty future date pagination records",
    emptyByFutureDate.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty future date pagination pages",
    emptyByFutureDate.pagination.pages,
    0,
  );
  // Test empty results with combined filters
  const emptyByCombinedFilters = await api.functional.redditLike.guests.index(
    connection,
    {
      body: {
        deviceFingerprint: "xyz_nonexistent_abc_12345",
        updatedAtFrom: futureIsoString,
        updatedAtTo: futureIsoString,
        sortBy: "deviceFingerprint",
        sortOrder: "asc",
        limit: 20,
        page: 3,
      } satisfies IRedditLikeGuest.IRequest,
    },
  );
  typia.assert(emptyByCombinedFilters);
  // Verify empty result structure maintains requested pagination
  TestValidator.equals(
    "empty combined data length",
    emptyByCombinedFilters.data.length,
    0,
  );
  TestValidator.equals(
    "empty combined pagination current",
    emptyByCombinedFilters.pagination.current,
    3,
  );
  TestValidator.equals(
    "empty combined pagination limit",
    emptyByCombinedFilters.pagination.limit,
    20,
  );
  TestValidator.equals(
    "empty combined pagination records",
    emptyByCombinedFilters.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty combined pagination pages",
    emptyByCombinedFilters.pagination.pages,
    0,
  );
}
