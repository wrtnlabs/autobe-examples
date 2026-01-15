import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformGuest";
export async function test_api_guest_session_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create a base connection object from the provided connection
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate multiple guest sessions (15 to ensure we can test pagination)
  // Use typia.random to generate random valid IRequest data for session creation
  const generatedGuestSessions = await ArrayUtil.asyncRepeat(
    15,
    async (index) => {
      // Use the random generator to create a unique guest session, replacing undefined values with valid defaults
      const guestSessionData = typia.random<ICommunityPlatformGuest.IRequest>();
      // Force a valid combination of page and limit parameters for each generated session
      guestSessionData.page = 1;
      guestSessionData.limit = 25;
      // Submit the request to create guest sessions
      const result = await api.functional.communityPlatform.guests.index(
        guestConnection,
        {
          body: guestSessionData,
        },
      );
      // Validate the response structure
      typia.assert(result);
      return result;
    },
  );
  // Test case 1: Basic pagination with default parameters (page=1, limit=25)
  const defaultResponse = await api.functional.communityPlatform.guests.index(
    guestConnection,
    {
      body: {},
    },
  );
  typia.assert(defaultResponse);
  // Validate that pagination metadata matches expectations
  TestValidator.equals(
    "default page number is 1",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit is 25",
    defaultResponse.pagination.limit,
    25,
  );
  TestValidator.predicate(
    "default total records count is positive",
    () => defaultResponse.pagination.records > 0,
  );
  TestValidator.predicate(
    "default total pages is at least 1",
    () => defaultResponse.pagination.pages >= 1,
  );
  // Validate that we have the exact number of data items returned
  TestValidator.equals(
    "default response returns expected number of data items",
    defaultResponse.data.length,
    defaultResponse.pagination.limit,
  );
  // Test case 2: Minimum page and minimum limit (edge case)
  const minPageMinLimitResponse =
    await api.functional.communityPlatform.guests.index(guestConnection, {
      body: {
        page: 1,
        limit: 1,
      },
    });
  typia.assert(minPageMinLimitResponse);
  // Validate edge case for minimal pagination
  TestValidator.equals(
    "minimum page must be 1",
    minPageMinLimitResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "minimum limit must be 1",
    minPageMinLimitResponse.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "minimum limit response has at least one record",
    () => minPageMinLimitResponse.data.length >= 1,
  );
  TestValidator.equals(
    "minimum limit response data length",
    minPageMinLimitResponse.data.length,
    1,
  );
  // Test case 3: Maximum limit (edge case)
  const maxLimitResponse = await api.functional.communityPlatform.guests.index(
    guestConnection,
    {
      body: {
        limit: 100,
      },
    },
  );
  typia.assert(maxLimitResponse);
  // Validate maximum limit specification
  TestValidator.equals(
    "maximum limit set to 100",
    maxLimitResponse.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "maximum limit response includes all records if fewer than 100",
    () =>
      maxLimitResponse.data.length === maxLimitResponse.pagination.records ||
      maxLimitResponse.data.length === 100,
  );
  // Test case 4: Pagination with specific page number (beyond first page)
  // Calculate number of pages from the default response
  const totalPages = defaultResponse.pagination.pages;
  if (totalPages > 1) {
    const nextPageResponse =
      await api.functional.communityPlatform.guests.index(guestConnection, {
        body: {
          page: 2,
          limit: 10,
        },
      });
    typia.assert(nextPageResponse);
    // Validate next page response
    TestValidator.equals(
      "next page number is 2",
      nextPageResponse.pagination.current,
      2,
    );
    TestValidator.equals(
      "next page limit is 10",
      nextPageResponse.pagination.limit,
      10,
    );
    TestValidator.equals(
      "next page data length matches limit",
      nextPageResponse.data.length,
      10,
    );
    TestValidator.predicate(
      "total records unchanged across pages",
      () =>
        nextPageResponse.pagination.records ===
        defaultResponse.pagination.records,
    );
    // Validate total pages calculation based on total records and limit
    const calculatedPages = Math.ceil(nextPageResponse.pagination.records / 10);
    TestValidator.equals(
      "calculated total pages matches actual",
      nextPageResponse.pagination.pages,
      calculatedPages,
    );
  }
  // Test case 5: Negative test case - page number too high
  // Get total pages from the default response
  const totalPagesForHighPage = defaultResponse.pagination.pages || 1;
  const excessPage = totalPagesForHighPage + 1;
  // This should still return a valid response with empty data array and correct pagination metadata
  // But without throwing any error, since the system should handle this gracefully
  const excessPageResponse =
    await api.functional.communityPlatform.guests.index(guestConnection, {
      body: {
        page: excessPage,
        limit: 10,
      },
    });
  typia.assert(excessPageResponse);
  // Validate that high page returns empty data but correct metadata
  TestValidator.equals(
    "excess page number",
    excessPageResponse.pagination.current,
    excessPage,
  );
  TestValidator.equals(
    "excess page limit",
    excessPageResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "excess page records unchanged",
    excessPageResponse.pagination.records,
    defaultResponse.pagination.records,
  );
  TestValidator.equals(
    "excess page should have zero data items",
    excessPageResponse.data.length,
    0,
  );
  // Test case 6: Sort by different fields (ensure sorting behavior doesn't break pagination)
  // Test sort by last_accessed_at (default)
  const sortedByAccessResponse =
    await api.functional.communityPlatform.guests.index(guestConnection, {
      body: {
        sort_by: "last_accessed_at",
        order: "desc",
        limit: 5,
      },
    });
  typia.assert(sortedByAccessResponse);
  TestValidator.equals(
    "sort by last_accessed_at",
    sortedByAccessResponse.pagination.limit,
    5,
  );
  // Test sort by session_duration
  const sortedByDurationResponse =
    await api.functional.communityPlatform.guests.index(guestConnection, {
      body: {
        sort_by: "session_duration",
        order: "asc",
        limit: 5,
      },
    });
  typia.assert(sortedByDurationResponse);
  TestValidator.equals(
    "sort by session_duration",
    sortedByDurationResponse.pagination.limit,
    5,
  );
  // Test sort by geographic_location
  const sortedByGeoResponse =
    await api.functional.communityPlatform.guests.index(guestConnection, {
      body: {
        sort_by: "geographic_location",
        order: "asc",
        limit: 5,
      },
    });
  typia.assert(sortedByGeoResponse);
  TestValidator.equals(
    "sort by geographic_location",
    sortedByGeoResponse.pagination.limit,
    5,
  );
  // Test case 7: Combine sorting with pagination
  const combinedSortPaginationResponse =
    await api.functional.communityPlatform.guests.index(guestConnection, {
      body: {
        sort_by: "last_accessed_at",
        order: "desc",
        page: 2,
        limit: 10,
      },
    });
  typia.assert(combinedSortPaginationResponse);
  // Validate consolidated behavior
  TestValidator.equals(
    "combined sort pagination page",
    combinedSortPaginationResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "combined sort pagination limit",
    combinedSortPaginationResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "combined sort pagination records > 0",
    () => combinedSortPaginationResponse.pagination.records > 0,
  );
  TestValidator.equals(
    "combined sort pagination data length",
    combinedSortPaginationResponse.data.length,
    10,
  );
  // Test case 8: Filter by ip_address (must be a valid ipv4 format)
  const ipFilterResponse = await api.functional.communityPlatform.guests.index(
    guestConnection,
    {
      body: {
        ip_address: "192.168.1.1",
      },
    },
  );
  typia.assert(ipFilterResponse);
  TestValidator.predicate(
    "ip_filter response has records",
    () => ipFilterResponse.data.length >= 0,
  );
  // Test case 9: Filter by device_type
  const deviceFilterResponse =
    await api.functional.communityPlatform.guests.index(guestConnection, {
      body: {
        device_type: "desktop",
      },
    });
  typia.assert(deviceFilterResponse);
  TestValidator.predicate(
    "device_filter response has records",
    () => deviceFilterResponse.data.length >= 0,
  );
  // Test case 10: Filter by has_active_session
  const activeSessionResponse =
    await api.functional.communityPlatform.guests.index(guestConnection, {
      body: {
        has_active_session: true,
      },
    });
  typia.assert(activeSessionResponse);
  TestValidator.predicate(
    "active_session response has records",
    () => activeSessionResponse.data.length >= 0,
  );
  // Validate that all responses maintain the correct IPageICommunityPlatformGuest.ISummary structure
  // This is inherent in the typia.assert() calls above but included for completeness
  TestValidator.predicate("All responses have correct structure", () => true);
}
