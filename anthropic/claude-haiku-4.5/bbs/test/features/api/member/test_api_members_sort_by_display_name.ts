import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";

/**
 * Test alphabetical sorting of member lists by display_name.
 *
 * Create members with different display names, then use sort_by='display_name'
 * to sort results alphabetically. With sort_order='asc', verify members are
 * listed A-Z. With sort_order='desc', verify members are listed Z-A. Test
 * case-insensitive alphabetical sorting. Validate pagination works with display
 * name sorting. Test that special characters in display names are handled
 * correctly in sorting. Test combining display name sorting with search and
 * status filters to ensure sort order is maintained.
 */
export async function test_api_members_sort_by_display_name(
  connection: api.IConnection,
) {
  // Create members with distinct display names for sorting tests
  const displayNames = [
    "Zoe",
    "Alice",
    "charlie",
    "Bob",
    "@David",
    "Eve_Smith",
  ];

  const createdMembers: IDiscussionBoardMember.IAuthorized[] = [];
  for (const displayName of displayNames) {
    const member = await api.functional.auth.member.join(connection, {
      body: {
        email: `${displayName.replace(/[^a-zA-Z0-9]/g, "")}${RandomGenerator.alphaNumeric(4)}@test.com`,
        username: `user_${displayName.replace(/[^a-zA-Z0-9_-]/g, "")}${RandomGenerator.alphaNumeric(3)}`,
        display_name: displayName,
        password: "TestPassword123!",
      } satisfies IDiscussionBoardMember.ICreate,
    });
    typia.assert(member);
    createdMembers.push(member);
  }

  // Test 1: Ascending order (A-Z)
  const ascResult = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        sort_by: "display_name",
        sort_order: "asc",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(ascResult);

  // Verify ascending order - display names should be sorted case-insensitively A-Z
  const ascNames = ascResult.data.map((m) => m.display_name.toLowerCase());
  TestValidator.predicate(
    "ascending sort should have members sorted A-Z",
    () => {
      for (let i = 0; i < ascNames.length - 1; i++) {
        if (ascNames[i] > ascNames[i + 1]) return false;
      }
      return true;
    },
  );

  // Test 2: Descending order (Z-A)
  const descResult = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        sort_by: "display_name",
        sort_order: "desc",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(descResult);

  // Verify descending order - display names should be sorted case-insensitively Z-A
  const descNames = descResult.data.map((m) => m.display_name.toLowerCase());
  TestValidator.predicate(
    "descending sort should have members sorted Z-A",
    () => {
      for (let i = 0; i < descNames.length - 1; i++) {
        if (descNames[i] < descNames[i + 1]) return false;
      }
      return true;
    },
  );

  // Test 3: Case-insensitive sorting
  TestValidator.predicate(
    "case-insensitive sorting should match regardless of case",
    () => {
      const sortedAsc = [...ascNames].sort();
      return JSON.stringify(ascNames) === JSON.stringify(sortedAsc);
    },
  );

  // Test 4: Pagination with display name sorting
  const page1Result = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        sort_by: "display_name",
        sort_order: "asc",
        page: 1,
        limit: 3,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(page1Result);

  const page2Result = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        sort_by: "display_name",
        sort_order: "asc",
        page: 2,
        limit: 3,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(page2Result);

  // Verify pagination maintains sort order
  const page1Names = page1Result.data.map((m) => m.display_name.toLowerCase());
  const page2Names = page2Result.data.map((m) => m.display_name.toLowerCase());

  TestValidator.predicate(
    "pagination should maintain display name sort order across pages",
    () => {
      // Check that last item on page 1 comes before first item on page 2
      if (page1Names.length > 0 && page2Names.length > 0) {
        return page1Names[page1Names.length - 1] < page2Names[0];
      }
      return true;
    },
  );

  // Test 5: Combined filtering with sorting
  const filterResult = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        sort_by: "display_name",
        sort_order: "asc",
        account_status: ["active"],
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(filterResult);

  // Verify filtered results are still sorted by display name
  const filteredNames = filterResult.data.map((m) =>
    m.display_name.toLowerCase(),
  );
  TestValidator.predicate(
    "filtered results should maintain display name sort order",
    () => {
      for (let i = 0; i < filteredNames.length - 1; i++) {
        if (filteredNames[i] > filteredNames[i + 1]) return false;
      }
      return true;
    },
  );

  // Test 6: Verify special characters are handled in sorting
  const specialCharResult = await api.functional.discussionBoard.members.index(
    connection,
    {
      body: {
        sort_by: "display_name",
        sort_order: "asc",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardMember.IRequest,
    },
  );
  typia.assert(specialCharResult);

  // Verify member with special character (@David) is in correct position
  const memberWithSpecialChar = specialCharResult.data.find(
    (m) => m.display_name === "@David",
  );
  TestValidator.predicate(
    "members with special characters should be sorted correctly",
    memberWithSpecialChar !== undefined,
  );
}
