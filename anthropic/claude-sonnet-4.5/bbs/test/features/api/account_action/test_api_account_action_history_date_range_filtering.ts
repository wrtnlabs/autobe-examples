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
 * Test filtering member enforcement history by date ranges using created_after
 * and created_before parameters.
 *
 * This scenario validates temporal filtering for reviewing enforcement actions
 * within specific time periods. The test creates a moderator account, then
 * creates multiple account actions at different times to establish a temporal
 * history. The moderator retrieves the member's history with created_after
 * parameter to view actions from a specific date forward, and uses
 * created_before to view actions up to a specific date. The test also combines
 * both parameters for precise date range filtering.
 *
 * Steps:
 *
 * 1. Create moderator account for authentication
 * 2. Create member account (second moderator acting as member)
 * 3. Create multiple account actions sequentially to establish temporal data
 * 4. Query with created_after to get recent actions
 * 5. Query with created_before to get older actions
 * 6. Query with both parameters for precise date range
 * 7. Validate correct filtering by timestamp boundaries
 */
export async function test_api_account_action_history_date_range_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "moderator123!",
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create member account (another moderator to act as member)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: memberEmail,
        password: "member123!",
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(member);

  const memberId = member.id;

  // Step 3: Create multiple account actions at different times
  const action1: IDiscussionBoardAccountAction =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: {
          discussion_board_member_id: memberId,
          action_type: "suspension",
          reason: "First violation - spam content",
          duration_days: 1,
        } satisfies IDiscussionBoardAccountAction.ICreate,
      },
    );
  typia.assert(action1);

  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));

  const action2: IDiscussionBoardAccountAction =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: {
          discussion_board_member_id: memberId,
          action_type: "suspension",
          reason: "Second violation - inappropriate language",
          duration_days: 7,
        } satisfies IDiscussionBoardAccountAction.ICreate,
      },
    );
  typia.assert(action2);

  await new Promise((resolve) => setTimeout(resolve, 100));

  const action3: IDiscussionBoardAccountAction =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: {
          discussion_board_member_id: memberId,
          action_type: "ban",
          reason: "Third violation - severe policy breach",
          duration_days: null,
        } satisfies IDiscussionBoardAccountAction.ICreate,
      },
    );
  typia.assert(action3);

  // Step 4: Test filtering with created_after parameter
  const middleTimestamp = action2.created_at;

  const recentActions: IPageIDiscussionBoardAccountAction.ISummary =
    await api.functional.discussionBoard.moderator.members.accountActions.index(
      connection,
      {
        memberId: memberId,
        body: {
          created_after: middleTimestamp,
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(recentActions);

  TestValidator.predicate(
    "created_after filter should include action2 and action3",
    recentActions.data.length >= 2,
  );

  // Validate all returned actions are after the timestamp
  for (const action of recentActions.data) {
    TestValidator.predicate(
      "action created_at should be >= created_after",
      new Date(action.created_at) >= new Date(middleTimestamp),
    );
  }

  // Step 5: Test filtering with created_before parameter
  const olderActions: IPageIDiscussionBoardAccountAction.ISummary =
    await api.functional.discussionBoard.moderator.members.accountActions.index(
      connection,
      {
        memberId: memberId,
        body: {
          created_before: action2.created_at,
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(olderActions);

  TestValidator.predicate(
    "created_before filter should include action1 and possibly action2",
    olderActions.data.length >= 1,
  );

  // Validate all returned actions are before or equal to the timestamp
  for (const action of olderActions.data) {
    TestValidator.predicate(
      "action created_at should be <= created_before",
      new Date(action.created_at) <= new Date(action2.created_at),
    );
  }

  // Step 6: Test filtering with both created_after and created_before
  const rangeActions: IPageIDiscussionBoardAccountAction.ISummary =
    await api.functional.discussionBoard.moderator.members.accountActions.index(
      connection,
      {
        memberId: memberId,
        body: {
          created_after: action1.created_at,
          created_before: action3.created_at,
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(rangeActions);

  // Validate all returned actions are within the date range
  for (const action of rangeActions.data) {
    const actionDate = new Date(action.created_at);
    TestValidator.predicate(
      "action should be within date range",
      actionDate >= new Date(action1.created_at) &&
        actionDate <= new Date(action3.created_at),
    );
  }

  // Step 7: Verify that combining filters with other parameters works
  const combinedFilter: IPageIDiscussionBoardAccountAction.ISummary =
    await api.functional.discussionBoard.moderator.members.accountActions.index(
      connection,
      {
        memberId: memberId,
        body: {
          created_after: action1.created_at,
          created_before: action3.created_at,
          action_type: "suspension",
          status: "active",
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(combinedFilter);

  // Validate combined filters work correctly
  for (const action of combinedFilter.data) {
    const actionDate = new Date(action.created_at);
    TestValidator.predicate(
      "combined filter: within date range",
      actionDate >= new Date(action1.created_at) &&
        actionDate <= new Date(action3.created_at),
    );
    TestValidator.equals(
      "combined filter: action_type is suspension",
      action.action_type,
      "suspension",
    );
    TestValidator.equals(
      "combined filter: status is active",
      action.status,
      "active",
    );
  }
}
