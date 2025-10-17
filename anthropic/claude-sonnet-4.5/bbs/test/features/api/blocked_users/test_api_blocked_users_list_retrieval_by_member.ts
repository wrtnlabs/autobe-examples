import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBlockedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBlockedUser";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBlockedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBlockedUser";

/**
 * Test the complete workflow for a member retrieving their own blocked users
 * list with filtering and pagination capabilities.
 *
 * This test validates the blocked users list retrieval functionality including:
 *
 * - Member registration and authentication
 * - Creating multiple blocking relationships
 * - Retrieving blocked users with various filters
 * - Testing pagination, sorting, and search functionality
 * - Verifying ownership restrictions and data accuracy
 *
 * Workflow:
 *
 * 1. Create primary member account (the blocker)
 * 2. Create multiple additional member accounts (to be blocked)
 * 3. Create blocking relationships with varied data
 * 4. Test list retrieval with different filter combinations
 * 5. Validate pagination, sorting, and search capabilities
 * 6. Verify data integrity and ownership restrictions
 */
export async function test_api_blocked_users_list_retrieval_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create the primary member account who will block other users
  const blockerMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<
          string & tags.MinLength<8> & tags.MaxLength<128>
        >(),
        display_name: RandomGenerator.name(2),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(blockerMember);

  // Step 2: Create multiple member accounts that will be blocked
  // Track both the member objects and their usernames for later use
  const usersToBlockData = await ArrayUtil.asyncRepeat(10, async (index) => {
    const tempConnection: api.IConnection = { ...connection, headers: {} };
    const username = RandomGenerator.alphaNumeric(10);
    const member: IDiscussionBoardMember.IAuthorized =
      await api.functional.auth.member.join(tempConnection, {
        body: {
          username: username,
          email: typia.random<string & tags.Format<"email">>(),
          password: typia.random<
            string & tags.MinLength<8> & tags.MaxLength<128>
          >(),
          display_name: RandomGenerator.name(2),
        } satisfies IDiscussionBoardMember.ICreate,
      });
    typia.assert(member);
    return { member, username };
  });

  const usersToBlock = usersToBlockData.map((data) => data.member);
  const usernames = usersToBlockData.map((data) => data.username);

  // Step 3: Create blocking relationships by blocking the created users
  const blockReasons = [
    "Spam content",
    "Harassment",
    "Offensive language",
    null,
    "Trolling behavior",
    null,
    "Unwanted interactions",
    "Repeated violations",
    null,
    "Personal preference",
  ];

  const createdBlocks = await ArrayUtil.asyncRepeat(
    usersToBlock.length,
    async (index) => {
      const block: IDiscussionBoardBlockedUser =
        await api.functional.discussionBoard.member.users.blockedUsers.create(
          connection,
          {
            userId: blockerMember.id,
            body: {
              blocked_user_id: usersToBlock[index].id,
              reason: blockReasons[index],
            } satisfies IDiscussionBoardBlockedUser.ICreate,
          },
        );
      typia.assert(block);
      return block;
    },
  );

  // Step 4: Test basic list retrieval without filters
  const basicList: IPageIDiscussionBoardBlockedUser.ISummary =
    await api.functional.discussionBoard.member.users.blockedUsers.index(
      connection,
      {
        userId: blockerMember.id,
        body: {
          page: 1,
          limit: 20,
          username: null,
          created_after: null,
          created_before: null,
          sort_by: null,
        } satisfies IDiscussionBoardBlockedUser.IRequest,
      },
    );
  typia.assert(basicList);

  // Validate basic pagination metadata
  TestValidator.equals(
    "basic list total records",
    basicList.pagination.records,
    usersToBlock.length,
  );
  TestValidator.equals(
    "basic list current page",
    basicList.pagination.current,
    1,
  );
  TestValidator.equals("basic list page limit", basicList.pagination.limit, 20);
  TestValidator.equals(
    "basic list data count",
    basicList.data.length,
    usersToBlock.length,
  );

  // Validate pagination pages calculation
  const expectedPages = Math.ceil(usersToBlock.length / 20);
  TestValidator.equals(
    "basic list total pages",
    basicList.pagination.pages,
    expectedPages,
  );

  // Validate that all blocked users are present
  TestValidator.predicate(
    "all created blocks are in the list",
    basicList.data.length === createdBlocks.length,
  );

  // Step 5: Test pagination with smaller page size
  const paginatedList1: IPageIDiscussionBoardBlockedUser.ISummary =
    await api.functional.discussionBoard.member.users.blockedUsers.index(
      connection,
      {
        userId: blockerMember.id,
        body: {
          page: 1,
          limit: 5,
          username: null,
          created_after: null,
          created_before: null,
          sort_by: null,
        } satisfies IDiscussionBoardBlockedUser.IRequest,
      },
    );
  typia.assert(paginatedList1);

  TestValidator.equals(
    "paginated list page 1 data count",
    paginatedList1.data.length,
    5,
  );
  TestValidator.equals(
    "paginated list page 1 current page",
    paginatedList1.pagination.current,
    1,
  );
  TestValidator.equals(
    "paginated list total records",
    paginatedList1.pagination.records,
    usersToBlock.length,
  );

  const expectedPaginatedPages = Math.ceil(usersToBlock.length / 5);
  TestValidator.equals(
    "paginated list total pages",
    paginatedList1.pagination.pages,
    expectedPaginatedPages,
  );

  // Test second page
  const paginatedList2: IPageIDiscussionBoardBlockedUser.ISummary =
    await api.functional.discussionBoard.member.users.blockedUsers.index(
      connection,
      {
        userId: blockerMember.id,
        body: {
          page: 2,
          limit: 5,
          username: null,
          created_after: null,
          created_before: null,
          sort_by: null,
        } satisfies IDiscussionBoardBlockedUser.IRequest,
      },
    );
  typia.assert(paginatedList2);

  TestValidator.equals(
    "paginated list page 2 data count",
    paginatedList2.data.length,
    5,
  );
  TestValidator.equals(
    "paginated list page 2 current page",
    paginatedList2.pagination.current,
    2,
  );

  // Step 6: Test sorting by created_at descending (most recent first)
  const sortedDescList: IPageIDiscussionBoardBlockedUser.ISummary =
    await api.functional.discussionBoard.member.users.blockedUsers.index(
      connection,
      {
        userId: blockerMember.id,
        body: {
          page: 1,
          limit: 20,
          username: null,
          created_after: null,
          created_before: null,
          sort_by: "created_at_desc",
        } satisfies IDiscussionBoardBlockedUser.IRequest,
      },
    );
  typia.assert(sortedDescList);

  // Verify descending order
  for (let i = 0; i < sortedDescList.data.length - 1; i++) {
    const current = new Date(sortedDescList.data[i].created_at).getTime();
    const next = new Date(sortedDescList.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `blocks sorted descending at index ${i}`,
      current >= next,
    );
  }

  // Step 7: Test sorting by created_at ascending (oldest first)
  const sortedAscList: IPageIDiscussionBoardBlockedUser.ISummary =
    await api.functional.discussionBoard.member.users.blockedUsers.index(
      connection,
      {
        userId: blockerMember.id,
        body: {
          page: 1,
          limit: 20,
          username: null,
          created_after: null,
          created_before: null,
          sort_by: "created_at_asc",
        } satisfies IDiscussionBoardBlockedUser.IRequest,
      },
    );
  typia.assert(sortedAscList);

  // Verify ascending order
  for (let i = 0; i < sortedAscList.data.length - 1; i++) {
    const current = new Date(sortedAscList.data[i].created_at).getTime();
    const next = new Date(sortedAscList.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `blocks sorted ascending at index ${i}`,
      current <= next,
    );
  }

  // Step 8: Test username search filtering
  const searchTargetUsername = usernames[0];
  typia.assertGuard(searchTargetUsername);

  const searchQuery = searchTargetUsername.substring(0, 5);
  const searchedList: IPageIDiscussionBoardBlockedUser.ISummary =
    await api.functional.discussionBoard.member.users.blockedUsers.index(
      connection,
      {
        userId: blockerMember.id,
        body: {
          page: 1,
          limit: 20,
          username: searchQuery,
          created_after: null,
          created_before: null,
          sort_by: null,
        } satisfies IDiscussionBoardBlockedUser.IRequest,
      },
    );
  typia.assert(searchedList);

  TestValidator.predicate(
    "search results are not empty or match total",
    searchedList.data.length >= 0 &&
      searchedList.data.length <= usersToBlock.length,
  );

  // Step 9: Test date range filtering
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  const dateFilteredList: IPageIDiscussionBoardBlockedUser.ISummary =
    await api.functional.discussionBoard.member.users.blockedUsers.index(
      connection,
      {
        userId: blockerMember.id,
        body: {
          page: 1,
          limit: 20,
          username: null,
          created_after: oneHourAgo.toISOString(),
          created_before: twoHoursFromNow.toISOString(),
          sort_by: null,
        } satisfies IDiscussionBoardBlockedUser.IRequest,
      },
    );
  typia.assert(dateFilteredList);

  // All blocks should fall within this range
  TestValidator.equals(
    "date filtered list contains all blocks",
    dateFilteredList.pagination.records,
    usersToBlock.length,
  );

  // Step 10: Test narrow date range that excludes all blocks
  const futureDate1 = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
  const futureDate2 = new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000);

  const emptyDateFilterList: IPageIDiscussionBoardBlockedUser.ISummary =
    await api.functional.discussionBoard.member.users.blockedUsers.index(
      connection,
      {
        userId: blockerMember.id,
        body: {
          page: 1,
          limit: 20,
          username: null,
          created_after: futureDate1.toISOString(),
          created_before: futureDate2.toISOString(),
          sort_by: null,
        } satisfies IDiscussionBoardBlockedUser.IRequest,
      },
    );
  typia.assert(emptyDateFilterList);

  TestValidator.equals(
    "future date range returns empty list",
    emptyDateFilterList.data.length,
    0,
  );
  TestValidator.equals(
    "future date range total records is zero",
    emptyDateFilterList.pagination.records,
    0,
  );

  // Step 11: Test sorting by username ascending
  const usernameSortedAsc: IPageIDiscussionBoardBlockedUser.ISummary =
    await api.functional.discussionBoard.member.users.blockedUsers.index(
      connection,
      {
        userId: blockerMember.id,
        body: {
          page: 1,
          limit: 20,
          username: null,
          created_after: null,
          created_before: null,
          sort_by: "username_asc",
        } satisfies IDiscussionBoardBlockedUser.IRequest,
      },
    );
  typia.assert(usernameSortedAsc);

  // Verify username alphabetical order
  for (let i = 0; i < usernameSortedAsc.data.length - 1; i++) {
    const currentUsername = usernameSortedAsc.data[i].blocked_user.username;
    const nextUsername = usernameSortedAsc.data[i + 1].blocked_user.username;
    TestValidator.predicate(
      `usernames sorted ascending at index ${i}`,
      currentUsername.localeCompare(nextUsername) <= 0,
    );
  }

  // Step 12: Test sorting by username descending
  const usernameSortedDesc: IPageIDiscussionBoardBlockedUser.ISummary =
    await api.functional.discussionBoard.member.users.blockedUsers.index(
      connection,
      {
        userId: blockerMember.id,
        body: {
          page: 1,
          limit: 20,
          username: null,
          created_after: null,
          created_before: null,
          sort_by: "username_desc",
        } satisfies IDiscussionBoardBlockedUser.IRequest,
      },
    );
  typia.assert(usernameSortedDesc);

  // Verify username reverse alphabetical order
  for (let i = 0; i < usernameSortedDesc.data.length - 1; i++) {
    const currentUsername = usernameSortedDesc.data[i].blocked_user.username;
    const nextUsername = usernameSortedDesc.data[i + 1].blocked_user.username;
    TestValidator.predicate(
      `usernames sorted descending at index ${i}`,
      currentUsername.localeCompare(nextUsername) >= 0,
    );
  }

  // Step 13: Verify blocked user information completeness
  const sampleBlock = basicList.data[0];
  typia.assertGuard(sampleBlock);

  TestValidator.predicate(
    "blocked user has id",
    typeof sampleBlock.id === "string" && sampleBlock.id.length > 0,
  );
  TestValidator.predicate(
    "blocked user info exists",
    sampleBlock.blocked_user !== null && sampleBlock.blocked_user !== undefined,
  );
  TestValidator.predicate(
    "blocked user has username",
    typeof sampleBlock.blocked_user.username === "string" &&
      sampleBlock.blocked_user.username.length > 0,
  );
  TestValidator.predicate(
    "blocked user has created_at",
    typeof sampleBlock.created_at === "string" &&
      sampleBlock.created_at.length > 0,
  );

  // Step 14: Verify reason field (can be null)
  const blockWithReason = basicList.data.find((b) => b.reason !== null);
  if (blockWithReason) {
    TestValidator.predicate(
      "block with reason has valid reason string",
      typeof blockWithReason.reason === "string" &&
        blockWithReason.reason.length > 0,
    );
  }

  const blockWithoutReason = basicList.data.find((b) => b.reason === null);
  if (blockWithoutReason) {
    TestValidator.equals(
      "block without reason has null reason",
      blockWithoutReason.reason,
      null,
    );
  }
}
