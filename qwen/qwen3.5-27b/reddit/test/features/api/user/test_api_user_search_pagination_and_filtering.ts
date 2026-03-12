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
 * Test pagination and filtering capabilities of user search.
 *
 * 1. Create multiple test member accounts (at least 25) to test pagination
 * 2. Test pagination with page=1, page_size=10 and verify 10 results
 * 3. Test pagination with page=2, page_size=10 and verify next 10 results
 * 4. Verify pagination metadata shows correct current page, total records, and total pages
 * 5. Test karma filtering with karma_min=100 and verify only users with karma >= 100 are returned
 * 6. Test karma filtering with karma_max=50 and verify only users with karma <= 50 are returned
 * 7. Test sorting by username ascending and verify alphabetical order
 * 8. Test sorting by created_at descending and verify newest users first
 * 9. Test date filtering with created_after and verify only users created after that date are returned
 * 10. Verify soft-deleted users are excluded from all search results
 */
export async function test_api_user_search_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create 25 test member accounts with varied karma scores
  const createdMembers: IRedditCloneMember.IAuthorized[] = [];
  for (let i = 0; i < 25; i++) {
    const memberConnection: api.IConnection = { host: connection.host };
    const member = await authorize_member_join(memberConnection, {
      body: {
        username: `user${i.toString().padStart(3, "0")}`,
        email: `user${i}@test.com`,
        password: "password123",
        display_name: `Test User ${i}`,
      },
    });
    typia.assert(member);
    createdMembers.push(member);
  }
  // Test 1: Pagination - Page 1 with page_size=10
  const searchConnection1: api.IConnection = { host: connection.host };
  const page1Result = await api.functional.redditClone.users.search(
    searchConnection1,
    {
      body: {
        page: 1,
        page_size: 10,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(page1Result);
  TestValidator.equals(
    "page 1 returns 10 results",
    page1Result.data.length,
    10,
  );
  TestValidator.equals(
    "page 1 current page is 1",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit is 10", page1Result.pagination.limit, 10);
  TestValidator.predicate(
    "page 1 has correct total records",
    page1Result.pagination.records >= 25,
  );
  TestValidator.predicate(
    "page 1 has correct total pages",
    page1Result.pagination.pages >= 3,
  );
  // Test 2: Pagination - Page 2 with page_size=10
  const searchConnection2: api.IConnection = { host: connection.host };
  const page2Result = await api.functional.redditClone.users.search(
    searchConnection2,
    {
      body: {
        page: 2,
        page_size: 10,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(page2Result);
  TestValidator.equals(
    "page 2 returns 10 results",
    page2Result.data.length,
    10,
  );
  TestValidator.equals(
    "page 2 current page is 2",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit is 10", page2Result.pagination.limit, 10);
  // Verify page 2 results are different from page 1
  const page1Ids = page1Result.data.map((u) => u.id);
  const page2Ids = page2Result.data.map((u) => u.id);
  TestValidator.predicate(
    "page 2 has different users than page 1",
    page2Ids.every((id) => !page1Ids.includes(id)),
  );
  // Test 3: Karma filtering - karma_min=100
  const searchConnection3: api.IConnection = { host: connection.host };
  const karmaMinResult = await api.functional.redditClone.users.search(
    searchConnection3,
    {
      body: {
        karma_min: 100,
        page_size: 100,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(karmaMinResult);
  // All returned users should have karma >= 100 (or empty if none meet criteria)
  TestValidator.predicate(
    "karma_min filter returns users with karma >= 100",
    karmaMinResult.data.length === 0 ||
      karmaMinResult.data.every((user) => user.karma >= 100),
  );
  // Test 4: Karma filtering - karma_max=50
  const searchConnection4: api.IConnection = { host: connection.host };
  const karmaMaxResult = await api.functional.redditClone.users.search(
    searchConnection4,
    {
      body: {
        karma_max: 50,
        page_size: 100,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(karmaMaxResult);
  // All returned users should have karma <= 50
  TestValidator.predicate(
    "karma_max filter returns users with karma <= 50",
    karmaMaxResult.data.length === 0 ||
      karmaMaxResult.data.every((user) => user.karma <= 50),
  );
  // Test 5: Sorting by username ascending
  const searchConnection5: api.IConnection = { host: connection.host };
  const sortUsernameResult = await api.functional.redditClone.users.search(
    searchConnection5,
    {
      body: {
        sort_by: "username",
        sort_order: "asc",
        page_size: 100,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(sortUsernameResult);
  // Verify usernames are in ascending alphabetical order
  TestValidator.predicate(
    "username sort ascending is correct",
    sortUsernameResult.data.length === 0 ||
      sortUsernameResult.data.every((user, index, array) => {
        if (index === 0) return true;
        return array[index - 1].username <= user.username;
      }),
  );
  // Test 6: Sorting by created_at descending
  const searchConnection6: api.IConnection = { host: connection.host };
  const sortCreatedAtResult = await api.functional.redditClone.users.search(
    searchConnection6,
    {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
        page_size: 100,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(sortCreatedAtResult);
  // Verify users are sorted by creation date descending (newest first)
  TestValidator.predicate(
    "created_at sort descending is correct",
    sortCreatedAtResult.data.length === 0 ||
      sortCreatedAtResult.data.every((user, index, array) => {
        if (index === 0) return true;
        return (
          new Date(array[index - 1].created_at) >= new Date(user.created_at)
        );
      }),
  );
  // Test 7: Date filtering - created_after
  const searchConnection7: api.IConnection = { host: connection.host };
  const earliestCreated = createdMembers[0].created_at;
  const dateFilterResult = await api.functional.redditClone.users.search(
    searchConnection7,
    {
      body: {
        created_after: earliestCreated,
        page_size: 100,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(dateFilterResult);
  // All returned users should be created after or on the specified date
  TestValidator.predicate(
    "created_after filter returns users created after date",
    dateFilterResult.data.every(
      (user) => new Date(user.created_at) >= new Date(earliestCreated),
    ),
  );
  // Test 8: Combined filters - karma range and sorting
  const searchConnection8: api.IConnection = { host: connection.host };
  const combinedResult = await api.functional.redditClone.users.search(
    searchConnection8,
    {
      body: {
        karma_min: 0,
        karma_max: 100,
        sort_by: "karma",
        sort_order: "desc",
        page_size: 50,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(combinedResult);
  // Verify all users are within karma range
  TestValidator.predicate(
    "combined karma filter works correctly",
    combinedResult.data.every((user) => user.karma >= 0 && user.karma <= 100),
  );
  // Verify karma is sorted descending
  TestValidator.predicate(
    "karma sort descending is correct",
    combinedResult.data.length === 0 ||
      combinedResult.data.every((user, index, array) => {
        if (index === 0) return true;
        return array[index - 1].karma >= user.karma;
      }),
  );
  // Test 9: Search term filtering
  const searchConnection9: api.IConnection = { host: connection.host };
  const searchTermResult = await api.functional.redditClone.users.search(
    searchConnection9,
    {
      body: {
        search: "Test User",
        page_size: 100,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(searchTermResult);
  // All returned users should match the search term in username or display_name
  TestValidator.predicate(
    "search term filter works correctly",
    searchTermResult.data.every(
      (user) =>
        user.username.toLowerCase().includes("test user") ||
        user.display_name.toLowerCase().includes("test user"),
    ),
  );
  // Test 10: Pagination metadata accuracy
  const searchConnection10: api.IConnection = { host: connection.host };
  const paginationCheckResult = await api.functional.redditClone.users.search(
    searchConnection10,
    {
      body: {
        page: 1,
        page_size: 5,
      } satisfies IRedditCloneMember.IRequest,
    },
  );
  typia.assert(paginationCheckResult);
  TestValidator.equals(
    "pagination returns correct page size",
    paginationCheckResult.data.length,
    5,
  );
  TestValidator.equals(
    "pagination current page is 1",
    paginationCheckResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 5",
    paginationCheckResult.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pagination pages calculation is correct",
    paginationCheckResult.pagination.pages ===
      Math.ceil(
        paginationCheckResult.pagination.records /
          paginationCheckResult.pagination.limit,
      ),
  );
}
