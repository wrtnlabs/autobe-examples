import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMember";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_list_sorting_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test sorting by username (ascending) - A to Z
  const usernameSortResponse =
    await api.functional.redditPlatform.members.index(connection, {
      body: {
        sort_by: "username" as const,
        sort_order: "asc" as const,
        limit: 20,
        page: 1,
      } satisfies IRedditPlatformMember.IRequest,
    });
  typia.assert(usernameSortResponse);
  // Verify username sorting (should be alphabetical)
  const usernamesAscending = usernameSortResponse.data.map((m) => m.username);
  const expectedUsernamesAscending = [...usernamesAscending].sort((a, b) =>
    a.localeCompare(b),
  );
  TestValidator.equals(
    "usernames should be sorted ascending",
    usernamesAscending,
    expectedUsernamesAscending,
  );
  // 2. Test sorting by karma (descending) - highest first
  const karmaSortResponse = await api.functional.redditPlatform.members.index(
    connection,
    {
      body: {
        sort_by: "karma" as const,
        sort_order: "desc" as const,
        limit: 20,
        page: 1,
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(karmaSortResponse);
  // Verify karma sorting (should be descending)
  const karmaDescending = karmaSortResponse.data.map((m) => m.karma);
  for (let i = 0; i < karmaDescending.length - 1; i++) {
    TestValidator.predicate(
      `karma at index ${i} should be >= index ${i + 1}`,
      karmaDescending[i] >= karmaDescending[i + 1],
    );
  }
  // 3. Test sorting by created_at (ascending) - oldest first
  const createdAtAscSortResponse =
    await api.functional.redditPlatform.members.index(connection, {
      body: {
        sort_by: "created_at" as const,
        sort_order: "asc" as const,
        limit: 20,
        page: 1,
      } satisfies IRedditPlatformMember.IRequest,
    });
  typia.assert(createdAtAscSortResponse);
  // Verify created_at ascending (oldest first)
  const datesAsc = createdAtAscSortResponse.data.map((m) => m.created_at);
  for (let i = 0; i < datesAsc.length - 1; i++) {
    TestValidator.predicate(
      `date at index ${i} should be <= index ${i + 1}`,
      new Date(datesAsc[i]) <= new Date(datesAsc[i + 1]),
    );
  }
  // 4. Test pagination - page=1, limit=5 (first 5 members)
  const page1Response = await api.functional.redditPlatform.members.index(
    connection,
    {
      body: {
        limit: 5,
        page: 1,
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(page1Response);
  TestValidator.equals(
    "page 1 should have 5 records",
    page1Response.data.length,
    5,
  );
  TestValidator.equals(
    "page 1 should have current=1",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 should have limit=5",
    page1Response.pagination.limit,
    5,
  );
  // 5. Test pagination - page=2, limit=5 (next 5 members)
  const page2Response = await api.functional.redditPlatform.members.index(
    connection,
    {
      body: {
        limit: 5,
        page: 2,
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 should have 5 records",
    page2Response.data.length,
    5,
  );
  TestValidator.equals(
    "page 2 should have current=2",
    page2Response.pagination.current,
    2,
  );
  // 6. Verify pagination metadata accuracy
  const totalRecords = page2Response.pagination.records;
  const calculatedPages = Math.ceil(
    totalRecords / page2Response.pagination.limit,
  );
  TestValidator.equals(
    "pages should be calculated correctly",
    page2Response.pagination.pages,
    calculatedPages,
  );
  // 7. Test default sort behavior (created_at descending when no sort parameters)
  const defaultSortResponse = await api.functional.redditPlatform.members.index(
    connection,
    {
      body: {
        limit: 10,
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(defaultSortResponse);
  // Default should be created_at descending (newest first)
  const defaultDates = defaultSortResponse.data.map((m) => m.created_at);
  for (let i = 0; i < defaultDates.length - 1; i++) {
    TestValidator.predicate(
      `default sort: date at index ${i} should be >= index ${i + 1}`,
      new Date(defaultDates[i]) >= new Date(defaultDates[i + 1]),
    );
  }
  // 8. Test boundary case: limit=100 (maximum records per page)
  const maxLimitResponse = await api.functional.redditPlatform.members.index(
    connection,
    {
      body: {
        limit: 100,
        page: 1,
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "max limit should have up to 100 records",
    maxLimitResponse.pagination.limit,
    100,
  );
  // 9. Test boundary case: limit=1 (single record per page)
  const minLimitResponse = await api.functional.redditPlatform.members.index(
    connection,
    {
      body: {
        limit: 1,
        page: 1,
      } satisfies IRedditPlatformMember.IRequest,
    },
  );
  typia.assert(minLimitResponse);
  TestValidator.equals(
    "min limit should have 1 record",
    minLimitResponse.data.length,
    1,
  );
  TestValidator.equals(
    "min limit should have limit=1",
    minLimitResponse.pagination.limit,
    1,
  );
}
