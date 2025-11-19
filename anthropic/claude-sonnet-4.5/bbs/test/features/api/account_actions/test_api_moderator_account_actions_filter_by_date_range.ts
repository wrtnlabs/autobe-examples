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
 * Test filtering moderator account action history by date range using
 * created_after and created_before parameters.
 *
 * This test validates temporal filtering for reviewing enforcement activity
 * within specific time periods. It creates account actions at different
 * timestamps and verifies that the date range filters correctly return only
 * actions within the specified time boundaries.
 *
 * Test workflow:
 *
 * 1. Create and authenticate as moderator
 * 2. Create member accounts as enforcement targets
 * 3. Create account actions at different timestamps
 * 4. Test created_after filter
 * 5. Test created_before filter
 * 6. Test combined date range filter (created_after + created_before)
 * 7. Validate that all returned actions fall within specified time ranges
 */
export async function test_api_moderator_account_actions_filter_by_date_range(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string>(),
      username: typia.random<string>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create member accounts as enforcement targets
  const memberCount = 5;
  const members = await ArrayUtil.asyncRepeat(memberCount, async () => {
    const unauthConn: api.IConnection = { ...connection, headers: {} };
    const member = await api.functional.auth.member.join(unauthConn, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        username: typia.random<
          string & tags.MinLength<3> & tags.MaxLength<30>
        >(),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
    typia.assert(member);
    return member;
  });

  // Step 3: Create account actions at different timestamps
  const actionTypes = ["suspension", "ban"] as const;
  const allActions: IDiscussionBoardAccountAction[] = [];

  // Create first batch of actions
  for (let i = 0; i < 2; i++) {
    const actionType = RandomGenerator.pick(actionTypes);
    const action =
      await api.functional.discussionBoard.moderator.accountActions.create(
        connection,
        {
          body: {
            discussion_board_member_id: members[i].id,
            action_type: actionType,
            reason: RandomGenerator.paragraph({ sentences: 2 }),
            duration_days:
              actionType === "suspension"
                ? RandomGenerator.pick([1, 7, 14, 30] as const)
                : null,
          } satisfies IDiscussionBoardAccountAction.ICreate,
        },
      );
    typia.assert(action);
    allActions.push(action);
  }

  // Use the last action's timestamp as the midpoint reference
  const midTimestamp = allActions[allActions.length - 1].created_at;

  // Wait a moment to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Create second batch of actions after the mid timestamp
  for (let i = 2; i < memberCount; i++) {
    const actionType = RandomGenerator.pick(actionTypes);
    const action =
      await api.functional.discussionBoard.moderator.accountActions.create(
        connection,
        {
          body: {
            discussion_board_member_id: members[i].id,
            action_type: actionType,
            reason: RandomGenerator.paragraph({ sentences: 2 }),
            duration_days:
              actionType === "suspension"
                ? RandomGenerator.pick([1, 7, 14, 30] as const)
                : null,
          } satisfies IDiscussionBoardAccountAction.ICreate,
        },
      );
    typia.assert(action);
    allActions.push(action);
  }

  // Step 4: Test created_after filter - should return only actions after midTimestamp
  const afterResult =
    await api.functional.discussionBoard.moderator.moderators.accountActions.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          created_after: midTimestamp,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(afterResult);

  // Validate that result is a subset of total actions
  TestValidator.predicate(
    "after filter should return subset of total actions",
    afterResult.data.length <= allActions.length,
  );

  // Validate that all returned actions were created after the midTimestamp
  for (const action of afterResult.data) {
    const actionDate = new Date(action.created_at);
    const midDate = new Date(midTimestamp);
    TestValidator.predicate(
      "action created_at should be after or equal to created_after filter",
      actionDate >= midDate,
    );
  }

  // Step 5: Test created_before filter - should return only actions before a cutoff
  const beforeTimestamp = new Date().toISOString();
  const beforeResult =
    await api.functional.discussionBoard.moderator.moderators.accountActions.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          created_before: beforeTimestamp,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(beforeResult);

  // Validate that all returned actions were created before the beforeTimestamp
  for (const action of beforeResult.data) {
    const actionDate = new Date(action.created_at);
    const beforeDate = new Date(beforeTimestamp);
    TestValidator.predicate(
      "action created_at should be before or equal to created_before filter",
      actionDate <= beforeDate,
    );
  }

  // Step 6: Test combined date range filter (created_after + created_before)
  const rangeResult =
    await api.functional.discussionBoard.moderator.moderators.accountActions.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          created_after: midTimestamp,
          created_before: beforeTimestamp,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(rangeResult);

  // Validate that all returned actions fall within the date range
  for (const action of rangeResult.data) {
    const actionDate = new Date(action.created_at);
    const midDate = new Date(midTimestamp);
    const beforeDate = new Date(beforeTimestamp);

    TestValidator.predicate(
      "action created_at should be within date range (after created_after)",
      actionDate >= midDate,
    );

    TestValidator.predicate(
      "action created_at should be within date range (before created_before)",
      actionDate <= beforeDate,
    );
  }

  // Step 7: Validate pagination metadata
  TestValidator.predicate(
    "pagination should have valid structure",
    rangeResult.pagination.current >= 1 &&
      rangeResult.pagination.limit > 0 &&
      rangeResult.pagination.records >= 0,
  );
}
