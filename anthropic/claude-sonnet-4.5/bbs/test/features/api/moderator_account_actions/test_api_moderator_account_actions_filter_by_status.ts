import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountAction";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAccountAction";

/**
 * Test filtering moderator account action history by enforcement status to
 * retrieve active or reversed actions.
 *
 * This scenario validates the status filter parameter for reviewing action
 * lifecycle states.
 *
 * Process:
 *
 * 1. Authenticate as a moderator who will manage various enforcement states
 * 2. Create multiple member accounts as targets for different action states
 * 3. Apply several account actions with different characteristics:
 *
 *    - Create active suspensions that remain in effect
 *    - Create actions that will be reversed
 * 4. Reverse some actions to create reversed status records
 * 5. Query with status='active' to verify only currently enforced actions are
 *    returned
 * 6. Query with status='reversed' to retrieve manually lifted actions
 * 7. Query without status filter to retrieve all actions regardless of state
 */
export async function test_api_moderator_account_actions_filter_by_status(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorUsername = RandomGenerator.alphaNumeric(10);

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: moderatorUsername,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create multiple member accounts as targets
  const members = await ArrayUtil.asyncRepeat(5, async () => {
    const memberConnection: api.IConnection = { ...connection, headers: {} };
    const memberEmail = typia.random<string & tags.Format<"email">>();
    const memberPassword = RandomGenerator.alphaNumeric(12);
    const memberUsername = RandomGenerator.alphaNumeric(10);

    const member = await api.functional.auth.member.join(memberConnection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        username: memberUsername,
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
    typia.assert(member);
    return member;
  });

  // Step 3: Apply various account actions
  // Create active suspensions (30 days - long duration)
  const activeSuspension1 =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: {
          discussion_board_member_id: members[0].id,
          action_type: "suspension",
          reason: "Active suspension test - policy violation",
          duration_days: 30,
        } satisfies IDiscussionBoardAccountAction.ICreate,
      },
    );
  typia.assert(activeSuspension1);

  const activeSuspension2 =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: {
          discussion_board_member_id: members[1].id,
          action_type: "suspension",
          reason: "Active suspension test - repeated violations",
          duration_days: 14,
        } satisfies IDiscussionBoardAccountAction.ICreate,
      },
    );
  typia.assert(activeSuspension2);

  // Create permanent ban (also active)
  const activeBan =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: {
          discussion_board_member_id: members[2].id,
          action_type: "ban",
          reason: "Permanent ban test - severe violation",
        } satisfies IDiscussionBoardAccountAction.ICreate,
      },
    );
  typia.assert(activeBan);

  // Create actions that will be reversed
  const toBeReversed1 =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: {
          discussion_board_member_id: members[3].id,
          action_type: "suspension",
          reason: "Suspension to be reversed - applied in error",
          duration_days: 7,
        } satisfies IDiscussionBoardAccountAction.ICreate,
      },
    );
  typia.assert(toBeReversed1);

  const toBeReversed2 =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: {
          discussion_board_member_id: members[4].id,
          action_type: "ban",
          reason: "Ban to be reversed - user appealed successfully",
        } satisfies IDiscussionBoardAccountAction.ICreate,
      },
    );
  typia.assert(toBeReversed2);

  // Step 4: Reverse some actions to create reversed status records
  const reversed1 =
    await api.functional.discussionBoard.moderator.accountActions.update(
      connection,
      {
        actionId: toBeReversed1.id,
        body: {
          status: "reversed",
          reversal_reason: "Applied in error - member did not violate policy",
        } satisfies IDiscussionBoardAccountAction.IUpdate,
      },
    );
  typia.assert(reversed1);
  TestValidator.equals("reversed action status", reversed1.status, "reversed");

  const reversed2 =
    await api.functional.discussionBoard.moderator.accountActions.update(
      connection,
      {
        actionId: toBeReversed2.id,
        body: {
          status: "reversed",
          reversal_reason: "User appeal successful - evidence provided",
        } satisfies IDiscussionBoardAccountAction.IUpdate,
      },
    );
  typia.assert(reversed2);
  TestValidator.equals("reversed ban status", reversed2.status, "reversed");

  // Step 5: Query with status='active' filter
  const activeResults =
    await api.functional.discussionBoard.moderator.moderators.accountActions.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          status: "active",
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(activeResults);

  // Verify only active actions are returned (3 active: 2 suspensions + 1 ban)
  TestValidator.equals("active filter count", activeResults.data.length, 3);
  TestValidator.predicate(
    "all results have active status",
    activeResults.data.every((action) => action.status === "active"),
  );

  // Step 6: Query with status='reversed' filter
  const reversedResults =
    await api.functional.discussionBoard.moderator.moderators.accountActions.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          status: "reversed",
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(reversedResults);

  // Verify only reversed actions are returned (2 reversed actions)
  TestValidator.equals("reversed filter count", reversedResults.data.length, 2);
  TestValidator.predicate(
    "all results have reversed status",
    reversedResults.data.every((action) => action.status === "reversed"),
  );

  // Step 7: Query without status filter to retrieve all actions
  const allResults =
    await api.functional.discussionBoard.moderator.moderators.accountActions.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(allResults);

  // Verify all actions are returned (5 total: 3 active + 2 reversed)
  TestValidator.equals("all actions count", allResults.data.length, 5);

  // Verify the total includes both active and reversed actions
  const activeCount = allResults.data.filter(
    (a) => a.status === "active",
  ).length;
  const reversedCount = allResults.data.filter(
    (a) => a.status === "reversed",
  ).length;
  TestValidator.equals("active count in all results", activeCount, 3);
  TestValidator.equals("reversed count in all results", reversedCount, 2);
}
