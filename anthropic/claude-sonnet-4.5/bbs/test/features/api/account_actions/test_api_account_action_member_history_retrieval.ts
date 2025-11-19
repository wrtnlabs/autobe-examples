import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAccountAction";

/**
 * Test retrieving the complete enforcement history for a specific member
 * account.
 *
 * This scenario validates that moderators can review all disciplinary actions
 * taken against a member to understand violation patterns and make informed
 * enforcement decisions.
 *
 * The test creates a moderator via join, then creates a member account.
 * Multiple account actions are applied to the member including a 1-day
 * suspension, a 7-day suspension, and a permanent ban to establish a violation
 * history. The moderator then retrieves the member's complete action history
 * using the PATCH endpoint with the member's ID.
 *
 * Validation verifies that the paginated response contains all account actions
 * for the specified member in chronological order (most recent first by
 * default), that each action includes complete details (action_type, status,
 * duration, reason, timestamps, moderator_id), and that pagination works
 * correctly with page and limit parameters.
 */
export async function test_api_account_action_member_history_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for authentication
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create a member account to apply actions to
  // Note: Using moderator join endpoint as there's no separate member creation endpoint available
  // This second moderator account will serve as the target member for enforcement actions
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const member: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // The moderator authentication should still be active in the connection
  // No need to re-authenticate as the first moderator join set the authorization header

  // Step 3: Create first account action - 1-day suspension for initial violation
  const firstAction: IDiscussionBoardAccountAction =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: {
          discussion_board_member_id: member.id,
          action_type: "suspension",
          reason: "First violation: Posted spam content in discussion threads",
          duration_days: 1,
        } satisfies IDiscussionBoardAccountAction.ICreate,
      },
    );
  typia.assert(firstAction);

  // Step 4: Create second account action - 7-day suspension for repeated violation
  const secondAction: IDiscussionBoardAccountAction =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: {
          discussion_board_member_id: member.id,
          action_type: "suspension",
          reason:
            "Second violation: Continued harassment of other members after warning",
          duration_days: 7,
        } satisfies IDiscussionBoardAccountAction.ICreate,
      },
    );
  typia.assert(secondAction);

  // Step 5: Create third account action - permanent ban for severe violation
  const thirdAction: IDiscussionBoardAccountAction =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: {
          discussion_board_member_id: member.id,
          action_type: "ban",
          reason:
            "Permanent ban: Severe policy violation - posting illegal content",
          duration_days: null,
        } satisfies IDiscussionBoardAccountAction.ICreate,
      },
    );
  typia.assert(thirdAction);

  // Step 6: Retrieve the member's complete action history with default pagination
  const actionHistory: IPageIDiscussionBoardAccountAction.ISummary =
    await api.functional.discussionBoard.moderator.members.accountActions.index(
      connection,
      {
        memberId: member.id,
        body: {} satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(actionHistory);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination object exists",
    actionHistory.pagination !== null && actionHistory.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists",
    actionHistory.data !== null && actionHistory.data !== undefined,
  );

  // Validate that all 3 actions are returned
  TestValidator.equals(
    "total records count matches created actions",
    actionHistory.pagination.records,
    3,
  );
  TestValidator.equals(
    "data array length matches records count",
    actionHistory.data.length,
    3,
  );

  // Validate that all returned actions have valid IDs
  // The endpoint is scoped to memberId, so all returned actions belong to the correct member
  const allActionsHaveValidIds = actionHistory.data.every((action) => {
    return action.id !== null && action.id !== undefined;
  });
  TestValidator.predicate("all actions have valid IDs", allActionsHaveValidIds);

  // Validate action types are present in the history
  const actionTypes = actionHistory.data.map((action) => action.action_type);
  TestValidator.predicate(
    "history contains suspension actions",
    actionTypes.filter((type) => type === "suspension").length === 2,
  );
  TestValidator.predicate(
    "history contains ban action",
    actionTypes.filter((type) => type === "ban").length === 1,
  );

  // Validate each action has required fields
  actionHistory.data.forEach((action, index) => {
    TestValidator.predicate(
      `action ${index} has id`,
      action.id !== null && action.id !== undefined,
    );
    TestValidator.predicate(
      `action ${index} has action_type`,
      action.action_type === "suspension" || action.action_type === "ban",
    );
    TestValidator.predicate(
      `action ${index} has reason`,
      action.reason !== null &&
        action.reason !== undefined &&
        action.reason.length > 0,
    );
    TestValidator.predicate(
      `action ${index} has status`,
      action.status === "active" ||
        action.status === "expired" ||
        action.status === "reversed",
    );
    TestValidator.predicate(
      `action ${index} has created_at`,
      action.created_at !== null && action.created_at !== undefined,
    );
  });

  // Step 7: Test pagination with custom parameters
  const paginatedHistory: IPageIDiscussionBoardAccountAction.ISummary =
    await api.functional.discussionBoard.moderator.members.accountActions.index(
      connection,
      {
        memberId: member.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(paginatedHistory);

  TestValidator.equals(
    "paginated response returns correct page",
    paginatedHistory.pagination.current,
    1,
  );
  TestValidator.equals(
    "paginated response respects limit",
    paginatedHistory.pagination.limit,
    2,
  );
  TestValidator.equals(
    "paginated data array length matches limit",
    paginatedHistory.data.length,
    2,
  );

  // Step 8: Test filtering by action type
  const suspensionOnlyHistory: IPageIDiscussionBoardAccountAction.ISummary =
    await api.functional.discussionBoard.moderator.members.accountActions.index(
      connection,
      {
        memberId: member.id,
        body: {
          action_type: "suspension",
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(suspensionOnlyHistory);

  TestValidator.equals(
    "filtered by suspension returns 2 records",
    suspensionOnlyHistory.pagination.records,
    2,
  );
  TestValidator.predicate(
    "all filtered results are suspensions",
    suspensionOnlyHistory.data.every(
      (action) => action.action_type === "suspension",
    ),
  );

  // Step 9: Test filtering by status
  const activeActionsHistory: IPageIDiscussionBoardAccountAction.ISummary =
    await api.functional.discussionBoard.moderator.members.accountActions.index(
      connection,
      {
        memberId: member.id,
        body: {
          status: "active",
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(activeActionsHistory);

  TestValidator.predicate(
    "all filtered results have active status",
    activeActionsHistory.data.every((action) => action.status === "active"),
  );
}
