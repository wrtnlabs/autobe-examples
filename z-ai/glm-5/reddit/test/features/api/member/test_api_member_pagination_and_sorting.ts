import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test pagination boundaries and sorting options for member list.
 *
 * This scenario validates:
 * - Sort by karma ascending/descending ('karma', '-karma')
 * - Sort by registration date ascending/descending ('created_at', '-created_at')
 * - Sort by username alphabetically ascending/descending ('username', '-username')
 * - Page navigation works correctly (different page numbers return different result sets)
 * - Limit parameter controls the number of results per page (default 20, maximum 100)
 * - Pagination metadata correctly calculates total pages based on total records and limit
 * - Last page may contain fewer records than the limit
 * - Page 1 returns the first set of results
 * - Requesting a page beyond available pages returns empty data array with correct pagination metadata
 * - Sort direction prefix '-' correctly inverts the default sort order
 */
export async function test_api_member_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Get total count of members for pagination testing
  const allMembers = await api.functional.communityPlatform.members.index(
    connection,
    { body: { limit: 100 } satisfies ICommunityPlatformMember.IRequest },
  );
  typia.assert(allMembers);
  // Test pagination with limit
  const page1 = await api.functional.communityPlatform.members.index(
    connection,
    { body: { page: 1, limit: 5 } satisfies ICommunityPlatformMember.IRequest },
  );
  typia.assert(page1);
  // Verify pagination metadata
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 5);
  TestValidator.predicate(
    "page 1 has correct records count",
    page1.data.length <= 5 && page1.data.length >= 0,
  );
  // Verify total pages calculation
  const expectedPages = Math.ceil(allMembers.pagination.records / 5);
  TestValidator.equals(
    "total pages calculation",
    page1.pagination.pages,
    expectedPages,
  );
  // Test page 2 returns different data
  const page2 = await api.functional.communityPlatform.members.index(
    connection,
    { body: { page: 2, limit: 5 } satisfies ICommunityPlatformMember.IRequest },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  if (page1.data.length > 0 && page2.data.length > 0) {
    TestValidator.notEquals(
      "different pages have different data",
      page1.data[0].id,
      page2.data[0].id,
    );
  }
  // Test sorting by karma descending (default)
  const sortedKarmaDesc = await api.functional.communityPlatform.members.index(
    connection,
    {
      body: {
        sort: "-karma",
        limit: 10,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(sortedKarmaDesc);
  // Verify karma is sorted descending
  for (let i = 1; i < sortedKarmaDesc.data.length; i++) {
    TestValidator.predicate(
      `karma descending at index ${i}`,
      sortedKarmaDesc.data[i - 1].karma >= sortedKarmaDesc.data[i].karma,
    );
  }
  // Test sorting by karma ascending
  const sortedKarmaAsc = await api.functional.communityPlatform.members.index(
    connection,
    {
      body: {
        sort: "karma",
        limit: 10,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(sortedKarmaAsc);
  for (let i = 1; i < sortedKarmaAsc.data.length; i++) {
    TestValidator.predicate(
      `karma ascending at index ${i}`,
      sortedKarmaAsc.data[i - 1].karma <= sortedKarmaAsc.data[i].karma,
    );
  }
  // Test sorting by created_at descending
  const sortedCreatedDesc =
    await api.functional.communityPlatform.members.index(connection, {
      body: {
        sort: "-created_at",
        limit: 10,
      } satisfies ICommunityPlatformMember.IRequest,
    });
  typia.assert(sortedCreatedDesc);
  for (let i = 1; i < sortedCreatedDesc.data.length; i++) {
    TestValidator.predicate(
      `created_at descending at index ${i}`,
      new Date(sortedCreatedDesc.data[i - 1].created_at).getTime() >=
        new Date(sortedCreatedDesc.data[i].created_at).getTime(),
    );
  }
  // Test sorting by created_at ascending
  const sortedCreatedAsc = await api.functional.communityPlatform.members.index(
    connection,
    {
      body: {
        sort: "created_at",
        limit: 10,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(sortedCreatedAsc);
  for (let i = 1; i < sortedCreatedAsc.data.length; i++) {
    TestValidator.predicate(
      `created_at ascending at index ${i}`,
      new Date(sortedCreatedAsc.data[i - 1].created_at).getTime() <=
        new Date(sortedCreatedAsc.data[i].created_at).getTime(),
    );
  }
  // Test sorting by username ascending
  const sortedUsernameAsc =
    await api.functional.communityPlatform.members.index(connection, {
      body: {
        sort: "username",
        limit: 10,
      } satisfies ICommunityPlatformMember.IRequest,
    });
  typia.assert(sortedUsernameAsc);
  for (let i = 1; i < sortedUsernameAsc.data.length; i++) {
    TestValidator.predicate(
      `username ascending at index ${i}`,
      sortedUsernameAsc.data[i - 1].username.localeCompare(
        sortedUsernameAsc.data[i].username,
      ) <= 0,
    );
  }
  // Test sorting by username descending
  const sortedUsernameDesc =
    await api.functional.communityPlatform.members.index(connection, {
      body: {
        sort: "-username",
        limit: 10,
      } satisfies ICommunityPlatformMember.IRequest,
    });
  typia.assert(sortedUsernameDesc);
  for (let i = 1; i < sortedUsernameDesc.data.length; i++) {
    TestValidator.predicate(
      `username descending at index ${i}`,
      sortedUsernameDesc.data[i - 1].username.localeCompare(
        sortedUsernameDesc.data[i].username,
      ) >= 0,
    );
  }
  // Test last page (may have fewer records)
  if (allMembers.pagination.pages > 0) {
    const lastPage = await api.functional.communityPlatform.members.index(
      connection,
      {
        body: {
          page: allMembers.pagination.pages,
          limit: 5,
        } satisfies ICommunityPlatformMember.IRequest,
      },
    );
    typia.assert(lastPage);
    TestValidator.equals(
      "last page number",
      lastPage.pagination.current,
      allMembers.pagination.pages,
    );
    TestValidator.predicate(
      "last page has valid data",
      lastPage.data.length <= 5 && lastPage.data.length >= 0,
    );
  }
  // Test page beyond available pages returns empty data
  const beyondPage = await api.functional.communityPlatform.members.index(
    connection,
    {
      body: {
        page: 9999,
        limit: 5,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(beyondPage);
  TestValidator.equals("beyond page has empty data", beyondPage.data.length, 0);
  TestValidator.equals(
    "beyond page current",
    beyondPage.pagination.current,
    9999,
  );
  TestValidator.predicate(
    "beyond page has correct pagination",
    beyondPage.pagination.pages >= 0 && beyondPage.pagination.records >= 0,
  );
}
