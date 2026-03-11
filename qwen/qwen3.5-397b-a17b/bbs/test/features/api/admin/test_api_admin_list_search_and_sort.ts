import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator list search and sort functionality.
 *
 * This test validates the comprehensive query capabilities for administrator
 * roster management including:
 * 1. Search by display name or email (case-insensitive partial matching)
 * 2. Sort by grade, created_at, or display_name
 * 3. Both ascending and descending sort directions
 * 4. Combined search and sort parameters
 * 5. Pagination metadata accuracy
 */
export async function test_api_admin_list_search_and_sort(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and register first administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: "Alice Johnson",
      bio: "First test administrator",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin1);
  // Create second administrator with different name
  const adminConnection2: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(adminConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: "Bob Smith",
      bio: "Second test administrator",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin2);
  // Create third administrator for more test data
  const adminConnection3: api.IConnection = { host: connection.host };
  const admin3 = await authorize_admin_join(adminConnection3, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: "Charlie Brown",
      bio: "Third test administrator",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin3);
  // Test 1: Basic list retrieval without filters
  const allAdmins = await api.functional.discussionBoard.admin.admins.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(allAdmins);
  TestValidator.predicate("has administrators", allAdmins.data.length >= 3);
  TestValidator.equals(
    "pagination current page",
    allAdmins.pagination.current,
    1,
  );
  TestValidator.predicate(
    "total records >= 3",
    allAdmins.pagination.records >= 3,
  );
  // Test 2: Search by display name (partial match, case-insensitive)
  const searchAlice = await api.functional.discussionBoard.admin.admins.index(
    adminConnection,
    {
      body: {
        search: "alice",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(searchAlice);
  TestValidator.predicate(
    "search alice returns results",
    searchAlice.data.length >= 1,
  );
  TestValidator.predicate(
    "alice result contains Alice",
    searchAlice.data.some((admin) =>
      admin.member.display_name.toLowerCase().includes("alice"),
    ),
  );
  // Test 3: Search by display name partial match
  const searchBob = await api.functional.discussionBoard.admin.admins.index(
    adminConnection,
    {
      body: {
        search: "bob",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(searchBob);
  TestValidator.predicate(
    "search bob returns results",
    searchBob.data.length >= 1,
  );
  TestValidator.predicate(
    "bob result contains Bob",
    searchBob.data.some((admin) =>
      admin.member.display_name.toLowerCase().includes("bob"),
    ),
  );
  // Test 4: Sort by display_name ascending
  const sortNameAsc = await api.functional.discussionBoard.admin.admins.index(
    adminConnection,
    {
      body: {
        sort: "display_name",
        direction: "asc",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(sortNameAsc);
  TestValidator.predicate(
    "name ascending order",
    sortNameAsc.data.length < 2 ||
      sortNameAsc.data.every(
        (admin, index) =>
          index === 0 ||
          admin.member.display_name >=
            sortNameAsc.data[index - 1].member.display_name,
      ),
  );
  // Test 5: Sort by display_name descending
  const sortNameDesc = await api.functional.discussionBoard.admin.admins.index(
    adminConnection,
    {
      body: {
        sort: "display_name",
        direction: "desc",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(sortNameDesc);
  TestValidator.predicate(
    "name descending order",
    sortNameDesc.data.length < 2 ||
      sortNameDesc.data.every(
        (admin, index) =>
          index === 0 ||
          admin.member.display_name <=
            sortNameDesc.data[index - 1].member.display_name,
      ),
  );
  // Test 6: Sort by created_at ascending
  const sortCreatedAsc =
    await api.functional.discussionBoard.admin.admins.index(adminConnection, {
      body: {
        sort: "created_at",
        direction: "asc",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardAdmin.IRequest,
    });
  typia.assert(sortCreatedAsc);
  TestValidator.predicate(
    "created_at ascending order",
    sortCreatedAsc.data.length < 2 ||
      sortCreatedAsc.data.every(
        (admin, index) =>
          index === 0 ||
          new Date(admin.created_at) >=
            new Date(sortCreatedAsc.data[index - 1].created_at),
      ),
  );
  // Test 7: Sort by created_at descending
  const sortCreatedDesc =
    await api.functional.discussionBoard.admin.admins.index(adminConnection, {
      body: {
        sort: "created_at",
        direction: "desc",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardAdmin.IRequest,
    });
  typia.assert(sortCreatedDesc);
  TestValidator.predicate(
    "created_at descending order",
    sortCreatedDesc.data.length < 2 ||
      sortCreatedDesc.data.every(
        (admin, index) =>
          index === 0 ||
          new Date(admin.created_at) <=
            new Date(sortCreatedDesc.data[index - 1].created_at),
      ),
  );
  // Test 8: Sort by grade
  const sortGrade = await api.functional.discussionBoard.admin.admins.index(
    adminConnection,
    {
      body: {
        sort: "grade",
        direction: "asc",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(sortGrade);
  TestValidator.predicate(
    "grade sort returns valid grades",
    sortGrade.data.every((admin) => ["regular", "super"].includes(admin.grade)),
  );
  // Test 9: Combined search and sort
  const searchAndSort = await api.functional.discussionBoard.admin.admins.index(
    adminConnection,
    {
      body: {
        search: "a",
        sort: "display_name",
        direction: "asc",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(searchAndSort);
  TestValidator.predicate(
    "search and sort returns filtered results",
    searchAndSort.data.every((admin) =>
      admin.member.display_name.toLowerCase().includes("a"),
    ),
  );
  TestValidator.predicate(
    "search and sort maintains order",
    searchAndSort.data.length < 2 ||
      searchAndSort.data.every(
        (admin, index) =>
          index === 0 ||
          admin.member.display_name >=
            searchAndSort.data[index - 1].member.display_name,
      ),
  );
  // Test 10: Pagination with limit
  const limitedResult = await api.functional.discussionBoard.admin.admins.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(limitedResult);
  TestValidator.predicate("limit respected", limitedResult.data.length <= 2);
  TestValidator.equals(
    "pagination limit matches",
    limitedResult.pagination.limit,
    2,
  );
  // Test 11: Filter by grade
  const filterGrade = await api.functional.discussionBoard.admin.admins.index(
    adminConnection,
    {
      body: {
        grade: "regular",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(filterGrade);
  TestValidator.predicate(
    "grade filter works",
    filterGrade.data.every((admin) => admin.grade === "regular"),
  );
}
