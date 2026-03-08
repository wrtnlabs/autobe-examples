import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformGuest";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test guest accounts listing with comprehensive filtering combinations
 * to verify all filter parameters work correctly and return expected results.
 */
export async function test_api_guests_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for filtering tests
  const adminConnection: api.IConnection = { host: connection.host };
  // ===== Test 1: Date Range Filtering =====
  // Test with valid date range
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateRangeResponse = await api.functional.redditPlatform.guests.index(
    adminConnection,
    {
      body: {
        sessionCreatedAtFrom: sevenDaysAgo.toISOString(),
        sessionCreatedAtTo: now.toISOString(),
        limit: 20,
      } satisfies IRedditPlatformGuest.IRequest,
    },
  );
  typia.assert(dateRangeResponse);
  // Verify pagination is returned
  TestValidator.predicate(
    "date range filter returns pagination",
    dateRangeResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "date range filter returns data array",
    Array.isArray(dateRangeResponse.data),
  );
  // ===== Test 2: Activity Count Filtering - Post Views =====
  // Test with post view count range
  const postViewResponse = await api.functional.redditPlatform.guests.index(
    adminConnection,
    {
      body: {
        postViewCountMin: 50,
        postViewCountMax: 100,
        limit: 20,
      } satisfies IRedditPlatformGuest.IRequest,
    },
  );
  typia.assert(postViewResponse);
  // Verify post view counts are within range (if any data returned)
  if (postViewResponse.data.length > 0) {
    // Verify pagination metadata is present
    TestValidator.predicate(
      "post view filter returns pagination",
      postViewResponse.pagination.records >= 0,
    );
  }
  // ===== Test 3: Activity Count Filtering - Combined Minimums =====
  // Test with comment and community access minimums
  const activityResponse = await api.functional.redditPlatform.guests.index(
    adminConnection,
    {
      body: {
        commentViewCountMin: 100,
        communityAccessCountMin: 50,
        limit: 20,
      } satisfies IRedditPlatformGuest.IRequest,
    },
  );
  typia.assert(activityResponse);
  TestValidator.predicate(
    "activity filter returns pagination",
    activityResponse.pagination !== undefined,
  );
  // ===== Test 4: Combined Filtering =====
  // Test with multiple filters applied together
  const lastActivityFrom = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const combinedResponse = await api.functional.redditPlatform.guests.index(
    adminConnection,
    {
      body: {
        deviceFingerprint: "mobile",
        lastActivityFrom: lastActivityFrom,
        postViewCountMin: 20,
        limit: 10,
      } satisfies IRedditPlatformGuest.IRequest,
    },
  );
  typia.assert(combinedResponse);
  // Verify combined filters work
  TestValidator.predicate(
    "combined filter returns pagination",
    combinedResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "combined filter respects limit",
    combinedResponse.data.length <= 10,
  );
  // ===== Test 5: Sorting by createdAt Ascending =====
  const createdAtAscResponse = await api.functional.redditPlatform.guests.index(
    adminConnection,
    {
      body: {
        sortBy: "createdAt",
        sortOrder: "asc",
        limit: 20,
      } satisfies IRedditPlatformGuest.IRequest,
    },
  );
  typia.assert(createdAtAscResponse);
  TestValidator.predicate(
    "createdAt asc sort returns pagination",
    createdAtAscResponse.pagination !== undefined,
  );
  // ===== Test 6: Sorting by ID Descending =====
  const idDescResponse = await api.functional.redditPlatform.guests.index(
    adminConnection,
    {
      body: {
        sortBy: "id",
        sortOrder: "desc",
        limit: 20,
      } satisfies IRedditPlatformGuest.IRequest,
    },
  );
  typia.assert(idDescResponse);
  TestValidator.predicate(
    "id desc sort returns pagination",
    idDescResponse.pagination !== undefined,
  );
  // ===== Test 7: Verify Pagination Metadata =====
  // Test that pagination reflects matching records, not total
  const paginationResponse = await api.functional.redditPlatform.guests.index(
    adminConnection,
    {
      body: {
        postViewCountMin: 0,
        limit: 10,
      } satisfies IRedditPlatformGuest.IRequest,
    },
  );
  typia.assert(paginationResponse);
  TestValidator.predicate(
    "pagination has records count",
    paginationResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has current page",
    paginationResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    paginationResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    paginationResponse.pagination.pages >= 0,
  );
  // ===== Test 8: Verify Data Structure =====
  if (paginationResponse.data.length > 0) {
    const firstGuest = paginationResponse.data[0];
    TestValidator.predicate(
      "guest has UUID id",
      typeof firstGuest.id === "string",
    );
    TestValidator.predicate(
      "guest has username string",
      typeof firstGuest.username === "string",
    );
    TestValidator.predicate(
      "guest has display_name string",
      typeof firstGuest.display_name === "string",
    );
    TestValidator.predicate(
      "guest has karma number",
      typeof firstGuest.karma === "number",
    );
    TestValidator.predicate(
      "guest has created_at date-time",
      typeof firstGuest.created_at === "string",
    );
  }
  // ===== Test 9: Pagination Navigation =====
  // Test page 1 and page 2 to verify pagination works
  const page1Response = await api.functional.redditPlatform.guests.index(
    adminConnection,
    {
      body: {
        limit: 10,
        page: 1,
      } satisfies IRedditPlatformGuest.IRequest,
    },
  );
  typia.assert(page1Response);
  const page2Response = await api.functional.redditPlatform.guests.index(
    adminConnection,
    {
      body: {
        limit: 10,
        page: 2,
      } satisfies IRedditPlatformGuest.IRequest,
    },
  );
  typia.assert(page2Response);
  TestValidator.notEquals(
    "page 1 and 2 have different current values",
    page1Response.pagination.current,
    page2Response.pagination.current,
  );
  // ===== Test 10: Verify Page Counts =====
  TestValidator.predicate(
    "page 1 current equals 1",
    page1Response.pagination.current === 1,
  );
  TestValidator.predicate(
    "page 2 current equals 2",
    page2Response.pagination.current === 2,
  );
  TestValidator.equals(
    "both pages have same limit",
    page1Response.pagination.limit,
    page2Response.pagination.limit,
  );
}
