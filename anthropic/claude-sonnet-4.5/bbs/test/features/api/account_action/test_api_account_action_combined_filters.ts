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
 * Test complex search scenarios combining multiple filter parameters
 * simultaneously.
 *
 * This test validates that the account action search API correctly applies
 * multiple filters with AND logic, returning only records that match ALL
 * specified criteria.
 *
 * The test creates a diverse set of account actions with different attributes
 * and performs searches combining action_type, status, member_id, and date
 * range filters to ensure precise query results.
 *
 * Steps:
 *
 * 1. Create and authenticate as moderator
 * 2. Create two members for member_id filtering
 * 3. Create diverse account actions with different attribute combinations
 * 4. Perform combined filter search and validate AND logic
 * 5. Test multiple filter combinations to ensure precision
 */
export async function test_api_account_action_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create two members for member_id filtering
  const member1: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member1);

  const member2: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member2);

  // Step 3: Create target action (suspension, active, member1) - this is our main target
  const targetAction: IDiscussionBoardAccountAction =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: {
          discussion_board_member_id: member1.id,
          action_type: "suspension" as const,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          duration_days: 7 as const,
        } satisfies IDiscussionBoardAccountAction.ICreate,
      },
    );
  typia.assert(targetAction);

  // Step 4: Create control actions with different attributes
  // Action for member2 (different member, same type)
  const action2: IDiscussionBoardAccountAction =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: {
          discussion_board_member_id: member2.id,
          action_type: "suspension" as const,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          duration_days: 14 as const,
        } satisfies IDiscussionBoardAccountAction.ICreate,
      },
    );
  typia.assert(action2);

  // Action for member1 but different type (ban instead of suspension)
  const action3: IDiscussionBoardAccountAction =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: {
          discussion_board_member_id: member1.id,
          action_type: "ban" as const,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardAccountAction.ICreate,
      },
    );
  typia.assert(action3);

  // Action for member2 with ban type
  const action4: IDiscussionBoardAccountAction =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: {
          discussion_board_member_id: member2.id,
          action_type: "ban" as const,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardAccountAction.ICreate,
      },
    );
  typia.assert(action4);

  // Step 5: Perform combined filter search (action_type + status + member_id + moderator_id + date range)
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const combinedFilterResult: IPageIDiscussionBoardAccountAction.ISummary =
    await api.functional.discussionBoard.moderator.accountActions.index(
      connection,
      {
        body: {
          action_type: "suspension" as const,
          status: "active" as const,
          member_id: member1.id,
          moderator_id: moderator.id,
          created_after: oneHourAgo,
          created_before: oneHourLater,
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(combinedFilterResult);

  // Step 6: Validate AND logic - only targetAction should match all criteria
  TestValidator.equals(
    "combined filters return exactly one matching action",
    combinedFilterResult.data.length,
    1,
  );

  TestValidator.equals(
    "returned action matches target action ID",
    combinedFilterResult.data[0].id,
    targetAction.id,
  );

  TestValidator.equals(
    "returned action has correct action_type",
    combinedFilterResult.data[0].action_type,
    "suspension" as const,
  );

  TestValidator.equals(
    "returned action has correct status",
    combinedFilterResult.data[0].status,
    "active" as const,
  );

  TestValidator.equals(
    "returned action has correct duration_days",
    combinedFilterResult.data[0].duration_days,
    7 as const,
  );

  // Step 7: Test filtering by action_type and member_id only
  const partialFilterResult: IPageIDiscussionBoardAccountAction.ISummary =
    await api.functional.discussionBoard.moderator.accountActions.index(
      connection,
      {
        body: {
          action_type: "suspension" as const,
          member_id: member1.id,
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(partialFilterResult);

  // Should return only suspensions for member1 (targetAction)
  TestValidator.equals(
    "partial filter returns exactly one suspension for member1",
    partialFilterResult.data.length,
    1,
  );

  TestValidator.equals(
    "partial filter result matches target action",
    partialFilterResult.data[0].id,
    targetAction.id,
  );

  // Step 8: Test filtering by action_type only (should return multiple results)
  const actionTypeFilterResult: IPageIDiscussionBoardAccountAction.ISummary =
    await api.functional.discussionBoard.moderator.accountActions.index(
      connection,
      {
        body: {
          action_type: "ban" as const,
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(actionTypeFilterResult);

  // Should return both ban actions (action3 and action4)
  TestValidator.equals(
    "action_type filter returns all ban actions",
    actionTypeFilterResult.data.length,
    2,
  );

  const banActionIds = actionTypeFilterResult.data.map((a) => a.id).sort();
  const expectedBanIds = [action3.id, action4.id].sort();
  TestValidator.equals(
    "ban action IDs match expected",
    banActionIds,
    expectedBanIds,
  );

  // Step 9: Test filtering by member_id only
  const memberFilterResult: IPageIDiscussionBoardAccountAction.ISummary =
    await api.functional.discussionBoard.moderator.accountActions.index(
      connection,
      {
        body: {
          member_id: member2.id,
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(memberFilterResult);

  // Should return both actions for member2 (action2 and action4)
  TestValidator.equals(
    "member_id filter returns all actions for member2",
    memberFilterResult.data.length,
    2,
  );

  const member2ActionIds = memberFilterResult.data.map((a) => a.id).sort();
  const expectedMember2Ids = [action2.id, action4.id].sort();
  TestValidator.equals(
    "member2 action IDs match expected",
    member2ActionIds,
    expectedMember2Ids,
  );

  // Step 10: Test date range filtering
  const dateRangeResult: IPageIDiscussionBoardAccountAction.ISummary =
    await api.functional.discussionBoard.moderator.accountActions.index(
      connection,
      {
        body: {
          created_after: oneHourAgo,
          created_before: oneHourLater,
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(dateRangeResult);

  // Should return all 4 actions created within the time window
  TestValidator.equals(
    "date range filter returns all recent actions",
    dateRangeResult.data.length,
    4,
  );
}
