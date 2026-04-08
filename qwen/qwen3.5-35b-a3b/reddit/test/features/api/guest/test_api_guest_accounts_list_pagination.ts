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

export async function test_api_guest_accounts_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test default pagination with sorting (no filters, default sort order)
  const defaultResponse = await api.functional.redditCommunity.guests.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        sort: "created_at",
        order: "desc",
      } satisfies IRedditCommunityGuest.IRequest,
    },
  );
  typia.assert(defaultResponse);
  // 2. Validate pagination metadata structure
  const { pagination, data } = defaultResponse;
  TestValidator.equals(
    "pagination current equals requested page",
    pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit equals requested limit",
    pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pagination.pages >= 0,
  );
  // 3. Validate pages calculation (ceiling of records / limit)
  const expectedPages =
    pagination.records > 0
      ? Math.ceil(pagination.records / pagination.limit)
      : 0;
  TestValidator.equals(
    "pagination pages calculation correct",
    pagination.pages,
    expectedPages,
  );
  // 4. Validate data structure - each guest record
  for (let i = 0; i < data.length; i++) {
    const guest = data[i];
    // Validate required fields exist and have correct types
    TestValidator.equals(
      `guest[${i}] has valid UUID id`,
      guest.id !== undefined,
      true,
    );
    TestValidator.equals(
      `guest[${i}] email is string`,
      typeof guest.email,
      "string",
    );
    // Validate optional fields are either string, null, or undefined
    if (guest.device_id !== undefined) {
      TestValidator.predicate(
        `guest[${i}] device_id is UUID or null`,
        guest.device_id === null || typeof guest.device_id === "string",
      );
    }
    if (guest.device_fingerprint !== undefined) {
      TestValidator.predicate(
        `guest[${i}] device_fingerprint is string or null`,
        guest.device_fingerprint === null ||
          typeof guest.device_fingerprint === "string",
      );
    }
    // Validate datetime format fields
    TestValidator.predicate(
      `guest[${i}] created_at is valid date-time string`,
      typeof guest.created_at === "string" &&
        !isNaN(Date.parse(guest.created_at)),
    );
    TestValidator.predicate(
      `guest[${i}] updated_at is valid date-time string`,
      typeof guest.updated_at === "string" &&
        !isNaN(Date.parse(guest.updated_at)),
    );
    TestValidator.predicate(
      `guest[${i}] deleted_at is date-time string or null`,
      guest.deleted_at === null ||
        (typeof guest.deleted_at === "string" &&
          !isNaN(Date.parse(guest.deleted_at))),
    );
  }
  // 5. Verify default sorting order by created_at descending
  if (data.length > 1) {
    // Extract created_at timestamps for comparison
    const timestamps = data.map((guest) =>
      new Date(guest.created_at).getTime(),
    );
    // Check if sorted in descending order
    let isDescending = true;
    for (let i = 0; i < timestamps.length - 1; i++) {
      if (timestamps[i] < timestamps[i + 1]) {
        isDescending = false;
        break;
      }
    }
    TestValidator.predicate(
      "guest accounts sorted by created_at descending",
      isDescending,
    );
  }
  // 6. Test page 2 to verify pagination
  const page2Response = await api.functional.redditCommunity.guests.index(
    connection,
    {
      body: {
        page: 2,
        limit: 10,
        sort: "created_at",
        order: "desc",
      } satisfies IRedditCommunityGuest.IRequest,
    },
  );
  typia.assert(page2Response);
  // Validate page 2 pagination
  TestValidator.equals(
    "page 2 current page is 2",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit matches request",
    page2Response.pagination.limit,
    10,
  );
  // Verify no duplicate IDs between page 1 and page 2
  const page1Ids = new Set(data.map((g) => g.id));
  const page2Ids = page2Response.data.map((g) => g.id);
  for (const id of page2Ids) {
    TestValidator.predicate(`page 2 ID ${id} not in page 1`, !page1Ids.has(id));
  }
  // 7. Test with deleted_at=false filter to ensure active accounts only
  const activeOnlyResponse = await api.functional.redditCommunity.guests.index(
    connection,
    {
      body: {
        deleted_at: false,
        limit: 10,
      } satisfies IRedditCommunityGuest.IRequest,
    },
  );
  typia.assert(activeOnlyResponse);
  // Validate all returned accounts have deleted_at as null (not soft-deleted)
  for (let i = 0; i < activeOnlyResponse.data.length; i++) {
    const guest = activeOnlyResponse.data[i];
    TestValidator.equals(
      `active-only guest[${i}] has deleted_at as null`,
      guest.deleted_at === null,
      true,
    );
  }
  // 8. Test with deleted_at=true to get soft-deleted accounts
  const deletedOnlyResponse = await api.functional.redditCommunity.guests.index(
    connection,
    {
      body: {
        deleted_at: true,
        limit: 10,
      } satisfies IRedditCommunityGuest.IRequest,
    },
  );
  typia.assert(deletedOnlyResponse);
  // Validate all returned accounts have deleted_at as non-null (soft-deleted)
  for (let i = 0; i < deletedOnlyResponse.data.length; i++) {
    const guest = deletedOnlyResponse.data[i];
    TestValidator.predicate(
      `deleted-only guest[${i}] has deleted_at not null`,
      guest.deleted_at !== null,
    );
  }
  // 9. Test default view excludes soft-deleted accounts
  const defaultViewResponse = await api.functional.redditCommunity.guests.index(
    connection,
    {
      body: {
        limit: 10,
      } satisfies IRedditCommunityGuest.IRequest,
    },
  );
  typia.assert(defaultViewResponse);
  // Validate default view excludes soft-deleted accounts (all should have deleted_at === null)
  for (let i = 0; i < defaultViewResponse.data.length; i++) {
    const guest = defaultViewResponse.data[i];
    TestValidator.equals(
      `default view guest[${i}] excludes soft-deleted (deleted_at is null)`,
      guest.deleted_at === null,
      true,
    );
  }
  // 10. Test email filtering with partial match
  if (data.length > 0) {
    const sampleEmail = data[0].email;
    const emailPattern = sampleEmail.substring(
      0,
      Math.floor(sampleEmail.length / 2),
    );
    const filteredResponse = await api.functional.redditCommunity.guests.index(
      connection,
      {
        body: {
          email: emailPattern,
          limit: 10,
        } satisfies IRedditCommunityGuest.IRequest,
      },
    );
    typia.assert(filteredResponse);
    // Validate that returned emails contain the pattern (if any results)
    for (const guest of filteredResponse.data) {
      TestValidator.predicate(
        `filtered guest email contains pattern`,
        guest.email.includes(emailPattern) || emailPattern === "",
      );
    }
  }
  // 11. Test custom sort by email
  const emailSortedResponse = await api.functional.redditCommunity.guests.index(
    connection,
    {
      body: {
        sort: "email",
        order: "asc",
        limit: 10,
      } satisfies IRedditCommunityGuest.IRequest,
    },
  );
  typia.assert(emailSortedResponse);
  if (emailSortedResponse.data.length > 1) {
    const emailTimestamps = emailSortedResponse.data.map(
      (guest) => guest.email,
    );
    const sortedEmails = [...emailTimestamps].sort();
    let isSorted = true;
    for (let i = 0; i < emailTimestamps.length - 1; i++) {
      if (emailTimestamps[i] > emailTimestamps[i + 1]) {
        isSorted = false;
        break;
      }
    }
    TestValidator.predicate(
      "guest accounts sorted by email ascending",
      isSorted,
    );
  }
}
