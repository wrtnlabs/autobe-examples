import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneMember";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member search functionality with various filter combinations and sorting.
 * 1. Create three test member accounts with different usernames, display names, and karma scores
 * 2. Test username partial matching with case-insensitive search
 * 3. Test display_name partial matching
 * 4. Test karma range filtering with karma_min and karma_max
 * 5. Test created_after and created_before date range filtering
 * 6. Test combined filters with sorting by karma descending
 * 7. Verify pagination works across filtered results
 */
export async function test_api_member_search_with_filters_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create three test member accounts with different characteristics
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      username: "testuser001",
      display_name: "Alice Test User",
      email: "alice.test@example.com",
      password: "password123",
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    },
  });
  typia.assert(member1);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      username: "testuser002",
      display_name: "Bob Test User",
      email: "bob.test@example.com",
      password: "password123",
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    },
  });
  typia.assert(member2);
  const member3Connection: api.IConnection = { host: connection.host };
  const member3 = await authorize_member_join(member3Connection, {
    body: {
      username: "testuser003",
      display_name: "Charlie Test User",
      email: "charlie.test@example.com",
      password: "password123",
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    },
  });
  typia.assert(member3);
  // Store member creation timestamps for date filtering tests
  const member1CreatedAt = new Date(member1.created_at).getTime();
  const member2CreatedAt = new Date(member2.created_at).getTime();
  const member3CreatedAt = new Date(member3.created_at).getTime();
  // 2. Test username partial matching (case-insensitive)
  const usernameSearch = await api.functional.redditClone.members.index(
    member1Connection,
    {
      body: {
        username: "TESTUSER001", // Test case-insensitive
        page: 1,
        page_size: 20,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(usernameSearch);
  TestValidator.equals(
    "username search returns 1 result",
    usernameSearch.data.length,
    1,
  );
  TestValidator.equals(
    "username search matches member1",
    usernameSearch.data[0].username,
    member1.username,
  );
  // 3. Test display_name partial matching
  const displayNameSearch = await api.functional.redditClone.members.index(
    member1Connection,
    {
      body: {
        display_name: "alice", // Test case-insensitive partial match
        page: 1,
        page_size: 20,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(displayNameSearch);
  TestValidator.equals(
    "display_name search returns 1 result",
    displayNameSearch.data.length,
    1,
  );
  TestValidator.predicate(
    "display_name contains alice",
    displayNameSearch.data[0].display_name.toLowerCase().includes("alice"),
  );
  // 4. Test karma range filtering
  // All members start with karma = 0, so filter karma_min=0 and karma_max=0 should return all 3
  const karmaRangeSearch = await api.functional.redditClone.members.index(
    member1Connection,
    {
      body: {
        karma_min: 0,
        karma_max: 0,
        page: 1,
        page_size: 20,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(karmaRangeSearch);
  TestValidator.equals(
    "karma range search returns 3 members",
    karmaRangeSearch.data.length,
    3,
  );
  // Test karma_min filter - should return all members with karma >= 0
  const karmaMinSearch = await api.functional.redditClone.members.index(
    member1Connection,
    {
      body: {
        karma_min: 0,
        page: 1,
        page_size: 20,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(karmaMinSearch);
  TestValidator.equals(
    "karma_min search returns 3 members",
    karmaMinSearch.data.length,
    3,
  );
  // Test karma_max filter - should return no members with karma <= -1
  const karmaMaxSearch = await api.functional.redditClone.members.index(
    member1Connection,
    {
      body: {
        karma_max: -1,
        page: 1,
        page_size: 20,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(karmaMaxSearch);
  TestValidator.equals(
    "karma_max search returns 0 members",
    karmaMaxSearch.data.length,
    0,
  );
  // 5. Test created_after and created_before date range filtering
  // Get all members created after member1 (should include member2 and member3)
  const createdAfterSearch = await api.functional.redditClone.members.index(
    member1Connection,
    {
      body: {
        created_after: new Date(member1CreatedAt + 1).toISOString(),
        page: 1,
        page_size: 20,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(createdAfterSearch);
  TestValidator.equals(
    "created_after search returns 2 members",
    createdAfterSearch.data.length,
    2,
  );
  // Get members created before member3 (should include member1 and member2)
  const createdBeforeSearch = await api.functional.redditClone.members.index(
    member1Connection,
    {
      body: {
        created_before: new Date(member3CreatedAt - 1).toISOString(),
        page: 1,
        page_size: 20,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(createdBeforeSearch);
  TestValidator.equals(
    "created_before search returns 2 members",
    createdBeforeSearch.data.length,
    2,
  );
  // Test combined date range (between member1 and member3)
  const dateRangeSearch = await api.functional.redditClone.members.index(
    member1Connection,
    {
      body: {
        created_after: new Date(member1CreatedAt).toISOString(),
        created_before: new Date(member3CreatedAt).toISOString(),
        page: 1,
        page_size: 20,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(dateRangeSearch);
  TestValidator.equals(
    "date range search returns 3 members",
    dateRangeSearch.data.length,
    3,
  );
  // 6. Test combined filters with sorting by karma descending
  const combinedSearch = await api.functional.redditClone.members.index(
    member1Connection,
    {
      body: {
        karma_min: 0,
        karma_max: 0,
        sort_by: "karma",
        sort_order: "desc",
        page: 1,
        page_size: 20,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(combinedSearch);
  TestValidator.equals(
    "combined filter returns 3 members",
    combinedSearch.data.length,
    3,
  );
  // Verify sorting by karma descending (all have same karma, so order is stable)
  for (let i = 1; i < combinedSearch.data.length; i++) {
    TestValidator.predicate(
      `karma descending order at index ${i}`,
      combinedSearch.data[i - 1].karma >= combinedSearch.data[i].karma,
    );
  }
  // Test sorting by username ascending
  const usernameSortSearch = await api.functional.redditClone.members.index(
    member1Connection,
    {
      body: {
        sort_by: "username",
        sort_order: "asc",
        page: 1,
        page_size: 20,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(usernameSortSearch);
  TestValidator.equals(
    "username sort returns 3 members",
    usernameSortSearch.data.length,
    3,
  );
  // Verify sorting by username ascending
  for (let i = 1; i < usernameSortSearch.data.length; i++) {
    TestValidator.predicate(
      `username ascending order at index ${i}`,
      usernameSortSearch.data[i - 1].username <=
        usernameSortSearch.data[i].username,
    );
  }
  // Test sorting by created_at descending (newest first)
  const createdAtSortSearch = await api.functional.redditClone.members.index(
    member1Connection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
        page: 1,
        page_size: 20,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(createdAtSortSearch);
  TestValidator.equals(
    "created_at sort returns 3 members",
    createdAtSortSearch.data.length,
    3,
  );
  // Verify sorting by created_at descending
  for (let i = 1; i < createdAtSortSearch.data.length; i++) {
    TestValidator.predicate(
      `created_at descending order at index ${i}`,
      new Date(createdAtSortSearch.data[i - 1].created_at).getTime() >=
        new Date(createdAtSortSearch.data[i].created_at).getTime(),
    );
  }
  // 7. Test pagination with filtered results
  const paginationSearch = await api.functional.redditClone.members.index(
    member1Connection,
    {
      body: {
        karma_min: 0,
        karma_max: 0,
        page: 1,
        page_size: 2,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(paginationSearch);
  TestValidator.equals(
    "pagination page 1 returns 2 members",
    paginationSearch.data.length,
    2,
  );
  TestValidator.equals(
    "pagination current page is 1",
    paginationSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination total records is 3",
    paginationSearch.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination total pages is 2",
    paginationSearch.pagination.pages,
    2,
  );
  // Get second page
  const paginationPage2 = await api.functional.redditClone.members.index(
    member1Connection,
    {
      body: {
        karma_min: 0,
        karma_max: 0,
        page: 2,
        page_size: 2,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(paginationPage2);
  TestValidator.equals(
    "pagination page 2 returns 1 member",
    paginationPage2.data.length,
    1,
  );
  TestValidator.equals(
    "pagination page 2 current page is 2",
    paginationPage2.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination page 2 total records is 3",
    paginationPage2.pagination.records,
    3,
  );
  // Test search parameter (combined username and display_name search)
  const searchParamSearch = await api.functional.redditClone.members.index(
    member1Connection,
    {
      body: {
        search: "test", // Should match all members with "test" in username or display_name
        page: 1,
        page_size: 20,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(searchParamSearch);
  TestValidator.equals(
    "search parameter returns 3 members",
    searchParamSearch.data.length,
    3,
  );
  // Test email partial matching
  const emailSearch = await api.functional.redditClone.members.index(
    member1Connection,
    {
      body: {
        email: "alice.test",
        page: 1,
        page_size: 20,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(emailSearch);
  TestValidator.equals(
    "email search returns 1 member",
    emailSearch.data.length,
    1,
  );
  TestValidator.equals(
    "email search matches member1 username",
    emailSearch.data[0].username,
    member1.username,
  );
}
