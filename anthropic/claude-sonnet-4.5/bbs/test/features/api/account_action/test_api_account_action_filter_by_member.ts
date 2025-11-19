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
 * Test filtering account actions by specific member to view their complete
 * disciplinary history.
 *
 * This test validates the member-specific filtering capability of the account
 * actions search endpoint. It creates multiple members with different violation
 * histories, applies various enforcement actions, and verifies that filtering
 * by member_id correctly isolates one member's actions from others.
 *
 * Test Flow:
 *
 * 1. Authenticate as moderator for enforcement operations
 * 2. Create Member A (target member for filtering)
 * 3. Apply multiple enforcement actions to Member A (suspension and ban)
 * 4. Create Member B (control data)
 * 5. Apply enforcement action to Member B
 * 6. Search with Member A's ID filter
 * 7. Validate only Member A's actions are returned
 * 8. Verify Member B's actions are excluded
 */
export async function test_api_account_action_filter_by_member(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.alphaNumeric(10),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create Member A - target member with multiple violations
  const memberA = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.alphaNumeric(10),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(memberA);

  // Step 3: Create first enforcement action for Member A (7-day suspension)
  const actionA1 =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: {
          discussion_board_member_id: memberA.id,
          action_type: "suspension",
          reason: "First violation - spam posting in multiple threads",
          duration_days: 7,
        } satisfies IDiscussionBoardAccountAction.ICreate,
      },
    );
  typia.assert(actionA1);

  // Step 4: Create second enforcement action for Member A (permanent ban)
  const actionA2 =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: {
          discussion_board_member_id: memberA.id,
          action_type: "ban",
          reason:
            "Repeated violations after suspension - harassment of other members",
          duration_days: null,
        } satisfies IDiscussionBoardAccountAction.ICreate,
      },
    );
  typia.assert(actionA2);

  // Step 5: Create Member B - control data
  const memberB = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.alphaNumeric(10),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(memberB);

  // Step 6: Create enforcement action for Member B (should be excluded from Member A's results)
  const actionB1 =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: {
          discussion_board_member_id: memberB.id,
          action_type: "suspension",
          reason: "Off-topic posting in serious discussion threads",
          duration_days: 1,
        } satisfies IDiscussionBoardAccountAction.ICreate,
      },
    );
  typia.assert(actionB1);

  // Step 7: Search account actions filtered by Member A's ID
  const filteredResults =
    await api.functional.discussionBoard.moderator.accountActions.index(
      connection,
      {
        body: {
          member_id: memberA.id,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(filteredResults);

  // Step 8: Validate that only Member A's actions are returned
  TestValidator.equals(
    "filtered results should contain exactly 2 actions for Member A",
    filteredResults.data.length,
    2,
  );

  // Step 9: Verify all returned actions belong to Member A
  const allActionsBelongToMemberA = filteredResults.data.every(
    (action) => action.id === actionA1.id || action.id === actionA2.id,
  );
  TestValidator.predicate(
    "all returned actions should belong to Member A",
    allActionsBelongToMemberA,
  );

  // Step 10: Verify Member B's action is NOT included
  const memberBActionIncluded = filteredResults.data.some(
    (action) => action.id === actionB1.id,
  );
  TestValidator.predicate(
    "Member B's action should not be included in Member A's results",
    !memberBActionIncluded,
  );

  // Step 11: Validate pagination reflects correct filtered count
  TestValidator.equals(
    "pagination records should match number of Member A's actions",
    filteredResults.pagination.records,
    2,
  );

  // Step 12: Verify action details match what was created
  const suspensionAction = filteredResults.data.find(
    (a) => a.id === actionA1.id,
  );
  if (suspensionAction) {
    typia.assertGuard(suspensionAction!);
    TestValidator.equals(
      "suspension action type should match",
      suspensionAction.action_type,
      "suspension",
    );
    TestValidator.equals(
      "suspension duration should be 7 days",
      suspensionAction.duration_days,
      7,
    );
  }

  const banAction = filteredResults.data.find((a) => a.id === actionA2.id);
  if (banAction) {
    typia.assertGuard(banAction!);
    TestValidator.equals(
      "ban action type should match",
      banAction.action_type,
      "ban",
    );
    TestValidator.equals(
      "ban should have no duration",
      banAction.duration_days,
      null,
    );
  }
}
