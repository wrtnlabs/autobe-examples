import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator's ability to search members by display name using partial matching and control sort order.
 *
 * Test Steps:
 * 1. Authenticate as an administrator using authorize_admin_join
 * 2. Create multiple member accounts with distinct display names for testing
 * 3. Call PATCH /discussionBoard/admin/members with search query for partial matching
 * 4. Verify returned members have display names matching the search query
 * 5. Test sort order ascending (oldest members first)
 * 6. Test sort order descending (newest members first)
 * 7. Test custom pagination with page and limit parameters
 * 8. Verify limit respects maximum value of 100 items per page
 * 9. Test empty search results return valid pagination structure
 */
export async function test_api_admin_member_list_search_and_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create multiple member accounts for testing
  const testMembers = ArrayUtil.repeat(5, (index) => ({
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: `TestMember${index}`,
    bio: RandomGenerator.paragraph({ sentences: 1 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  })) satisfies IDiscussionBoardAdmin.IJoin[];
  const createdMembers: IDiscussionBoardAdmin.IAuthorized[] = [];
  for (const memberData of testMembers) {
    const memberConnection: api.IConnection = { host: connection.host };
    const member = await authorize_admin_join(memberConnection, {
      body: memberData,
    });
    typia.assert(member);
    createdMembers.push(member);
  }
  // 3. Test search with partial display name matching
  const searchQuery = "TestMember";
  const searchResult = await api.functional.discussionBoard.admin.members.index(
    adminConnection,
    {
      body: {
        search: searchQuery,
        sort: "desc",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(searchResult);
  // 4. Verify search results contain matching display names
  TestValidator.predicate("search results contain matching display names", () =>
    searchResult.data.every((member) =>
      member.display_name.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
  );
  // 5. Test ascending sort (oldest members first)
  const ascResult = await api.functional.discussionBoard.admin.members.index(
    adminConnection,
    {
      body: {
        sort: "asc",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(ascResult);
  // 6. Test descending sort (newest members first)
  const descResult = await api.functional.discussionBoard.admin.members.index(
    adminConnection,
    {
      body: {
        sort: "desc",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(descResult);
  // 7. Verify sort order is correct
  if (ascResult.data.length >= 2) {
    const firstCreated = new Date(ascResult.data[0].created_at).getTime();
    const secondCreated = new Date(ascResult.data[1].created_at).getTime();
    TestValidator.predicate(
      "ascending sort - oldest first",
      () => firstCreated <= secondCreated,
    );
  }
  if (descResult.data.length >= 2) {
    const firstCreated = new Date(descResult.data[0].created_at).getTime();
    const secondCreated = new Date(descResult.data[1].created_at).getTime();
    TestValidator.predicate(
      "descending sort - newest first",
      () => firstCreated >= secondCreated,
    );
  }
  // 8. Test pagination with custom page and limit
  const paginationResult =
    await api.functional.discussionBoard.admin.members.index(adminConnection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination limit matches request",
    paginationResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination current page",
    paginationResult.pagination.current,
    1,
  );
  // 9. Test maximum limit validation (100 items)
  const maxLimitResult =
    await api.functional.discussionBoard.admin.members.index(adminConnection, {
      body: {
        limit: 100,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(maxLimitResult);
  TestValidator.predicate(
    "limit respects maximum 100 items",
    () => maxLimitResult.data.length <= 100,
  );
  // 10. Test empty search results
  const emptySearchResult =
    await api.functional.discussionBoard.admin.members.index(adminConnection, {
      body: {
        search: "NonExistentMember_xyz123",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(emptySearchResult);
  TestValidator.equals(
    "empty search returns zero records",
    emptySearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search returns empty data array",
    emptySearchResult.data.length,
    0,
  );
}
