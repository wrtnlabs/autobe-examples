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
 * Test complex filtering scenarios combining multiple filter parameters to
 * create precise queries of moderator enforcement history.
 *
 * This test validates that multiple filters work correctly together for
 * advanced analysis workflows, enabling sophisticated enforcement pattern
 * analysis and accountability reviews.
 *
 * Workflow:
 *
 * 1. Authenticate as moderator
 * 2. Create multiple member accounts as targets
 * 3. Create diverse account actions with different types, statuses, and timestamps
 * 4. Reverse some actions to create status variety
 * 5. Query with combined filters and validate results match all criteria
 */
export async function test_api_moderator_account_actions_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string>(),
      username: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create multiple member accounts as targets
  const members = await ArrayUtil.asyncRepeat(5, async () => {
    const member = await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        username: typia.random<
          string & tags.MinLength<3> & tags.MaxLength<30>
        >(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
    typia.assert(member);
    return member;
  });

  // Step 3: Create diverse account actions with different combinations
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  // Create active suspensions
  const activeSuspension1 =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: {
          discussion_board_member_id: members[0].id,
          action_type: "suspension",
          reason: "Spam violation - active suspension 1",
          duration_days: 7,
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
          reason: "Harassment - active suspension 2",
          duration_days: 14,
        } satisfies IDiscussionBoardAccountAction.ICreate,
      },
    );
  typia.assert(activeSuspension2);

  // Create active ban
  const activeBan =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: {
          discussion_board_member_id: members[2].id,
          action_type: "ban",
          reason: "Severe policy violation - permanent ban",
        } satisfies IDiscussionBoardAccountAction.ICreate,
      },
    );
  typia.assert(activeBan);

  // Create another suspension and then reverse it
  const suspensionToReverse =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: {
          discussion_board_member_id: members[3].id,
          action_type: "suspension",
          reason: "Initial suspension - will be reversed",
          duration_days: 30,
        } satisfies IDiscussionBoardAccountAction.ICreate,
      },
    );
  typia.assert(suspensionToReverse);

  // Step 4: Reverse the suspension to create status variety
  const reversedAction =
    await api.functional.discussionBoard.moderator.accountActions.update(
      connection,
      {
        actionId: suspensionToReverse.id,
        body: {
          status: "reversed",
          reversal_reason: "Applied in error - user successfully appealed",
        } satisfies IDiscussionBoardAccountAction.IUpdate,
      },
    );
  typia.assert(reversedAction);

  // Create another ban
  const recentBan =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: {
          discussion_board_member_id: members[4].id,
          action_type: "ban",
          reason: "Repeated violations after warnings",
        } satisfies IDiscussionBoardAccountAction.ICreate,
      },
    );
  typia.assert(recentBan);

  // Step 5: Query with combined filters and validate results

  // Test 1: Filter by action_type 'suspension' AND status 'active'
  const activeSuspensionsResult =
    await api.functional.discussionBoard.moderator.moderators.accountActions.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          action_type: "suspension",
          status: "active",
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(activeSuspensionsResult);

  TestValidator.predicate(
    "active suspensions filter returns results",
    activeSuspensionsResult.data.length > 0,
  );

  activeSuspensionsResult.data.forEach((action) => {
    TestValidator.equals(
      "action is suspension type",
      action.action_type,
      "suspension",
    );
    TestValidator.equals("action is active status", action.status, "active");
  });

  // Test 2: Filter by action_type 'ban' AND created_after
  const recentBansResult =
    await api.functional.discussionBoard.moderator.moderators.accountActions.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          action_type: "ban",
          created_after: twoDaysAgo.toISOString(),
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(recentBansResult);

  TestValidator.predicate(
    "recent bans filter returns results",
    recentBansResult.data.length > 0,
  );

  recentBansResult.data.forEach((action) => {
    TestValidator.equals("action is ban type", action.action_type, "ban");
    const createdAt = new Date(action.created_at);
    TestValidator.predicate(
      "action created after filter date",
      createdAt >= twoDaysAgo,
    );
  });

  // Test 3: Filter by status 'reversed' AND date range
  const reversedActionsResult =
    await api.functional.discussionBoard.moderator.moderators.accountActions.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          status: "reversed",
          created_after: twoDaysAgo.toISOString(),
          created_before: new Date(
            now.getTime() + 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(reversedActionsResult);

  TestValidator.predicate(
    "reversed actions filter returns results",
    reversedActionsResult.data.length > 0,
  );

  reversedActionsResult.data.forEach((action) => {
    TestValidator.equals(
      "action is reversed status",
      action.status,
      "reversed",
    );
    const createdAt = new Date(action.created_at);
    TestValidator.predicate(
      "action within date range",
      createdAt >= twoDaysAgo &&
        createdAt <= new Date(now.getTime() + 60 * 60 * 1000),
    );
  });

  // Test 4: Verify combined filters exclude non-matching records
  const allActionsResult =
    await api.functional.discussionBoard.moderator.moderators.accountActions.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {} satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(allActionsResult);

  TestValidator.predicate(
    "total actions count is greater than filtered results",
    allActionsResult.data.length >= activeSuspensionsResult.data.length,
  );

  TestValidator.predicate(
    "filtered results are subset of total",
    activeSuspensionsResult.data.length < allActionsResult.data.length,
  );
}
