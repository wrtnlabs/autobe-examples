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

export async function test_api_guest_listing_filtering_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Generate test data with valid filter values
  const fingerprintPrefix = RandomGenerator.alphaNumeric(6);
  const createdAtGte = new Date("2024-01-01T00:00:00Z");
  const createdAtLte = new Date("2024-12-31T23:59:59Z");
  const updatedAtGte = new Date("2024-06-01T00:00:00Z");
  const updatedAtLte = new Date("2024-12-31T23:59:59Z");
  // 1. Test comprehensive filtering with all parameters
  const comprehensiveFilters = {
    fingerprint_prefix: fingerprintPrefix,
    created_at_gte: createdAtGte.toISOString(),
    created_at_lte: createdAtLte.toISOString(),
    updated_at_gte: updatedAtGte.toISOString(),
    updated_at_lte: updatedAtLte.toISOString(),
    deleted_at: "null",
    session_status: "active",
    sort_by: "updated_at" as const,
    sort_order: "desc" as const,
    page: 1,
    limit: 10,
  } satisfies IRedditPlatformGuest.IRequest;
  const comprehensiveResponse =
    await api.functional.redditPlatform.guests.index(connection, {
      body: comprehensiveFilters,
    });
  typia.assert(comprehensiveResponse);
  // Validate comprehensive response structure
  TestValidator.predicate(
    "comprehensive response has data array",
    Array.isArray(comprehensiveResponse.data),
  );
  TestValidator.equals(
    "comprehensive pagination has current",
    comprehensiveResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "comprehensive pagination has limit",
    comprehensiveResponse.pagination.limit,
    10,
  );
  // Validate each guest matches filter criteria
  for (const guest of comprehensiveResponse.data) {
    TestValidator.predicate(
      "guest id is valid uuid format",
      /^[0-9a-f-]{36}$/i.test(guest.id),
    );
    TestValidator.predicate(
      "guest fingerprint has content",
      guest.fingerprint.length > 0,
    );
    TestValidator.predicate(
      "guest created_at is valid date-time",
      !isNaN(new Date(guest.created_at).getTime()),
    );
    TestValidator.predicate(
      "guest updated_at is valid date-time",
      !isNaN(new Date(guest.updated_at).getTime()),
    );
    TestValidator.equals(
      "guest deleted_at is null (active)",
      guest.deleted_at,
      null,
    );
    TestValidator.predicate(
      "guest active_session_count is non-negative",
      guest.active_session_count >= 0,
    );
  }
  // 2. Test single fingerprint_prefix filter
  const fingerprintOnly = {
    fingerprint_prefix: fingerprintPrefix,
    limit: 10,
  } satisfies IRedditPlatformGuest.IRequest;
  const fingerprintResponse = await api.functional.redditPlatform.guests.index(
    connection,
    {
      body: fingerprintOnly,
    },
  );
  typia.assert(fingerprintResponse);
  TestValidator.equals(
    "fingerprint only pagination has current",
    fingerprintResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "fingerprint only pagination has limit",
    fingerprintResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "fingerprint only pagination has records",
    fingerprintResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "fingerprint only pagination has pages",
    fingerprintResponse.pagination.pages >= 0,
  );
  // 3. Test single date range filter
  const dateRangeOnly = {
    created_at_gte: createdAtGte.toISOString(),
    created_at_lte: createdAtLte.toISOString(),
    limit: 10,
  } satisfies IRedditPlatformGuest.IRequest;
  const dateRangeResponse = await api.functional.redditPlatform.guests.index(
    connection,
    {
      body: dateRangeOnly,
    },
  );
  typia.assert(dateRangeResponse);
  TestValidator.equals(
    "date range pagination has current",
    dateRangeResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "date range pagination has limit",
    dateRangeResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "date range pagination has records",
    dateRangeResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "date range pagination has pages",
    dateRangeResponse.pagination.pages >= 0,
  );
  // 4. Test session_status filter
  const sessionStatusFilter = {
    session_status: "active",
    limit: 10,
  } satisfies IRedditPlatformGuest.IRequest;
  const sessionStatusResponse =
    await api.functional.redditPlatform.guests.index(connection, {
      body: sessionStatusFilter,
    });
  typia.assert(sessionStatusResponse);
  TestValidator.predicate(
    "session status response has data array",
    Array.isArray(sessionStatusResponse.data),
  );
  TestValidator.equals(
    "session status pagination has limit",
    sessionStatusResponse.pagination.limit,
    10,
  );
  // 5. Test deleted_at filter with "not_null"
  const deletedFilter = {
    deleted_at: "not_null",
    limit: 10,
  } satisfies IRedditPlatformGuest.IRequest;
  const deletedResponse = await api.functional.redditPlatform.guests.index(
    connection,
    {
      body: deletedFilter,
    },
  );
  typia.assert(deletedResponse);
  TestValidator.equals(
    "deleted response pagination has current",
    deletedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "deleted response pagination has limit",
    deletedResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "deleted response pagination has records",
    deletedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "deleted response pagination has pages",
    deletedResponse.pagination.pages >= 0,
  );
  // Validate soft-deleted guests have non-null deleted_at
  if (deletedResponse.data.length > 0) {
    for (const guest of deletedResponse.data) {
      TestValidator.notEquals(
        "soft-deleted guest has non-null deleted_at",
        guest.deleted_at,
        null,
      );
    }
  }
  // 6. Test sorting by id with ascending order
  const idSortAsc = {
    sort_by: "id" as const,
    sort_order: "asc" as const,
    limit: 10,
  } satisfies IRedditPlatformGuest.IRequest;
  const idSortAscResponse = await api.functional.redditPlatform.guests.index(
    connection,
    {
      body: idSortAsc,
    },
  );
  typia.assert(idSortAscResponse);
  // Validate ascending sort order by id
  if (idSortAscResponse.data.length > 1) {
    const isAscending = idSortAscResponse.data.every((guest, index) => {
      if (index === 0) return true;
      return guest.id.localeCompare(idSortAscResponse.data[index - 1].id) >= 0;
    });
    TestValidator.predicate("id sort ascending is correct", isAscending);
  }
  // 7. Test sorting by id with descending order
  const idSortDesc = {
    sort_by: "id" as const,
    sort_order: "desc" as const,
    limit: 10,
  } satisfies IRedditPlatformGuest.IRequest;
  const idSortDescResponse = await api.functional.redditPlatform.guests.index(
    connection,
    {
      body: idSortDesc,
    },
  );
  typia.assert(idSortDescResponse);
  // Validate descending sort order by id
  if (idSortDescResponse.data.length > 1) {
    const isDescending = idSortDescResponse.data.every((guest, index) => {
      if (index === 0) return true;
      return guest.id.localeCompare(idSortDescResponse.data[index - 1].id) <= 0;
    });
    TestValidator.predicate("id sort descending is correct", isDescending);
  }
  // 8. Test maximum limit (100)
  const maxLimitFilter = {
    limit: 100,
  } satisfies IRedditPlatformGuest.IRequest;
  const maxLimitResponse = await api.functional.redditPlatform.guests.index(
    connection,
    {
      body: maxLimitFilter,
    },
  );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "max limit pagination has correct limit",
    maxLimitResponse.pagination.limit,
    100,
  );
  // 9. Test minimum limit (1)
  const minLimitFilter = {
    limit: 1,
  } satisfies IRedditPlatformGuest.IRequest;
  const minLimitResponse = await api.functional.redditPlatform.guests.index(
    connection,
    {
      body: minLimitFilter,
    },
  );
  typia.assert(minLimitResponse);
  TestValidator.equals(
    "min limit pagination has correct limit",
    minLimitResponse.pagination.limit,
    1,
  );
  TestValidator.equals(
    "min limit returns single item",
    minLimitResponse.data.length,
    1,
  );
  // 10. Test pagination with different page numbers
  const page2Filter = {
    page: 2,
    limit: 5,
  } satisfies IRedditPlatformGuest.IRequest;
  const page2Response = await api.functional.redditPlatform.guests.index(
    connection,
    {
      body: page2Filter,
    },
  );
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 pagination has current",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 pagination has limit",
    page2Response.pagination.limit,
    5,
  );
  const page3Filter = {
    page: 3,
    limit: 5,
  } satisfies IRedditPlatformGuest.IRequest;
  const page3Response = await api.functional.redditPlatform.guests.index(
    connection,
    {
      body: page3Filter,
    },
  );
  typia.assert(page3Response);
  TestValidator.equals(
    "page 3 pagination has current",
    page3Response.pagination.current,
    3,
  );
  TestValidator.equals(
    "page 3 pagination has limit",
    page3Response.pagination.limit,
    5,
  );
  // 11. Test updated_at sort order
  const updatedAtSort = {
    sort_by: "updated_at" as const,
    sort_order: "desc" as const,
    limit: 10,
  } satisfies IRedditPlatformGuest.IRequest;
  const updatedAtSortResponse =
    await api.functional.redditPlatform.guests.index(connection, {
      body: updatedAtSort,
    });
  typia.assert(updatedAtSortResponse);
  // Validate updated_at descending sort
  if (updatedAtSortResponse.data.length > 1) {
    const isUpdatedDesc = updatedAtSortResponse.data.every((guest, index) => {
      if (index === 0) return true;
      return (
        new Date(guest.updated_at).getTime() <=
        new Date(updatedAtSortResponse.data[index - 1].updated_at).getTime()
      );
    });
    TestValidator.predicate(
      "updated_at sort descending is correct",
      isUpdatedDesc,
    );
  }
  // 12. Test created_at sort order (default, but verify explicit setting)
  const createdAtSort = {
    sort_by: "created_at" as const,
    sort_order: "asc" as const,
    limit: 10,
  } satisfies IRedditPlatformGuest.IRequest;
  const createdAtSortResponse =
    await api.functional.redditPlatform.guests.index(connection, {
      body: createdAtSort,
    });
  typia.assert(createdAtSortResponse);
  // Validate created_at ascending sort
  if (createdAtSortResponse.data.length > 1) {
    const isCreatedAsc = createdAtSortResponse.data.every((guest, index) => {
      if (index === 0) return true;
      return (
        new Date(guest.created_at).getTime() >=
        new Date(createdAtSortResponse.data[index - 1].created_at).getTime()
      );
    });
    TestValidator.predicate(
      "created_at sort ascending is correct",
      isCreatedAsc,
    );
  }
  // 13. Test combined filters with pagination metadata
  const combinedWithPagination = {
    fingerprint_prefix: fingerprintPrefix,
    deleted_at: "null",
    session_status: "active",
    sort_by: "updated_at",
    sort_order: "desc",
    page: 1,
    limit: 20,
  } satisfies IRedditPlatformGuest.IRequest;
  const combinedResponse = await api.functional.redditPlatform.guests.index(
    connection,
    {
      body: combinedWithPagination,
    },
  );
  typia.assert(combinedResponse);
  // Validate pagination metadata reflects filtered results
  TestValidator.predicate(
    "pagination records is non-negative",
    combinedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    combinedResponse.pagination.pages >= 0,
  );
  TestValidator.equals(
    "pagination current is 1",
    combinedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20",
    combinedResponse.pagination.limit,
    20,
  );
  // Validate calculated pages matches records / limit
  const expectedPages = Math.ceil(
    combinedResponse.pagination.records / combinedResponse.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages matches calculation",
    combinedResponse.pagination.pages,
    expectedPages,
  );
  // 14. Test that all required fields are present in guest summaries
  if (combinedResponse.data.length > 0) {
    const firstGuest = combinedResponse.data[0];
    TestValidator.predicate(
      "guest has id field",
      typeof firstGuest.id === "string",
    );
    TestValidator.predicate(
      "guest has fingerprint field",
      typeof firstGuest.fingerprint === "string",
    );
    TestValidator.predicate(
      "guest has created_at field",
      typeof firstGuest.created_at === "string",
    );
    TestValidator.predicate(
      "guest has updated_at field",
      typeof firstGuest.updated_at === "string",
    );
    TestValidator.predicate(
      "guest has deleted_at field",
      typeof firstGuest.deleted_at === "string" ||
        firstGuest.deleted_at === null,
    );
    TestValidator.predicate(
      "guest has active_session_count field",
      typeof firstGuest.active_session_count === "number",
    );
  }
  // 15. Test that fingerprint_prefix performs prefix matching
  const prefixTestFilter = {
    fingerprint_prefix: fingerprintPrefix,
    limit: 100,
  } satisfies IRedditPlatformGuest.IRequest;
  const prefixTestResponse = await api.functional.redditPlatform.guests.index(
    connection,
    {
      body: prefixTestFilter,
    },
  );
  typia.assert(prefixTestResponse);
  // Validate all returned fingerprints start with the prefix
  if (prefixTestResponse.data.length > 0) {
    const allMatchPrefix = prefixTestResponse.data.every((guest) =>
      guest.fingerprint.startsWith(fingerprintPrefix),
    );
    TestValidator.predicate("all fingerprints match prefix", allMatchPrefix);
  }
}
