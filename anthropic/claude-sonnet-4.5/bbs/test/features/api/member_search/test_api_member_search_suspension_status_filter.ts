import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountAction";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";

/**
 * Test member search filtering by account suspension status.
 *
 * This test validates that moderators can effectively filter member search
 * results based on suspension status. The test creates multiple member
 * accounts, suspends some of them using account action operations, and then
 * verifies that search filtering works correctly for:
 *
 * 1. Finding only suspended members (isSuspended=true)
 * 2. Finding only active non-suspended members (isSuspended=false)
 * 3. Finding all members regardless of status (filter omitted)
 *
 * This ensures moderators can identify suspended accounts for review or
 * unsuspension actions, and can distinguish between active and suspended member
 * populations.
 */
export async function test_api_member_search_suspension_status_filter(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "moderator123!",
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(2),
      href: "https://example.com/moderator/join",
      referrer: "https://example.com/login",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create multiple member accounts for testing
  const memberCount = 5;
  const createdMembers: IDiscussionBoardMember.IAuthorized[] = [];

  for (let i = 0; i < memberCount; i++) {
    const member = await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "member123!",
        username: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(2),
        href: "https://example.com/member/join",
        referrer: "https://example.com/home",
      } satisfies IDiscussionBoardMember.ICreate,
    });
    typia.assert(member);
    createdMembers.push(member);
  }

  TestValidator.equals(
    "created expected number of members",
    createdMembers.length,
    memberCount,
  );

  // Step 3: Suspend some members (suspend first 2 members)
  const suspendCount = 2;
  const suspendedMemberIds: string[] = [];

  for (let i = 0; i < suspendCount; i++) {
    const accountAction =
      await api.functional.discussionBoard.moderator.accountActions.create(
        connection,
        {
          body: {
            discussion_board_member_id: createdMembers[i].id,
            action_type: "suspension",
            reason: `Test suspension ${i + 1} - policy violation`,
            duration_days: 7,
          } satisfies IDiscussionBoardAccountAction.ICreate,
        },
      );
    typia.assert(accountAction);
    suspendedMemberIds.push(createdMembers[i].id);
  }

  TestValidator.equals(
    "suspended expected number of members",
    suspendedMemberIds.length,
    suspendCount,
  );

  // Step 4: Search with isSuspended=true filter (should return only suspended members)
  const suspendedSearch =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        isSuspended: true,
        page: 1,
        limit: 50,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(suspendedSearch);

  TestValidator.predicate(
    "suspended search returns at least the suspended members",
    suspendedSearch.data.length >= suspendCount,
  );

  const foundSuspendedIds = suspendedSearch.data
    .filter((member) => suspendedMemberIds.includes(member.id))
    .map((member) => member.id);

  TestValidator.equals(
    "all suspended members found in suspended search",
    foundSuspendedIds.sort(),
    suspendedMemberIds.sort(),
  );

  // Step 5: Search with isSuspended=false filter (should return only non-suspended members)
  const activeSearch =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        isSuspended: false,
        page: 1,
        limit: 50,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(activeSearch);

  const activeMemberIds = createdMembers
    .filter((member) => !suspendedMemberIds.includes(member.id))
    .map((member) => member.id);

  const foundActiveIds = activeSearch.data
    .filter((member) => activeMemberIds.includes(member.id))
    .map((member) => member.id);

  TestValidator.equals(
    "all active members found in active search",
    foundActiveIds.sort(),
    activeMemberIds.sort(),
  );

  // Verify no suspended members in active search
  const suspendedInActiveSearch = activeSearch.data.filter((member) =>
    suspendedMemberIds.includes(member.id),
  );

  TestValidator.equals(
    "no suspended members in active search results",
    suspendedInActiveSearch.length,
    0,
  );

  // Step 6: Search without isSuspended filter (should return all members)
  const allMembersSearch =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        page: 1,
        limit: 50,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(allMembersSearch);

  const allCreatedMemberIds = createdMembers.map((member) => member.id);
  const foundAllIds = allMembersSearch.data
    .filter((member) => allCreatedMemberIds.includes(member.id))
    .map((member) => member.id);

  TestValidator.equals(
    "all created members found when no filter applied",
    foundAllIds.sort(),
    allCreatedMemberIds.sort(),
  );
}
