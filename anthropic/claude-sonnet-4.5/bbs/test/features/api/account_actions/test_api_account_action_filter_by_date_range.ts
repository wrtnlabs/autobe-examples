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
 * Test filtering account actions by creation date range using created_after and
 * created_before parameters.
 *
 * This test validates the temporal filtering capabilities of the account action
 * search API. Moderators authenticate, create enforcement actions at different
 * times, then use date range filters to retrieve only actions created within
 * specific time periods. Validates that created_after returns actions on or
 * after the specified timestamp, created_before returns actions on or before
 * the timestamp, and combining both parameters correctly implements date range
 * filtering for moderation activity reports.
 *
 * Test Flow:
 *
 * 1. Authenticate as moderator
 * 2. Create multiple members as enforcement targets
 * 3. Create first account action and capture timestamp
 * 4. Wait briefly to ensure temporal separation
 * 5. Create second account action with later timestamp
 * 6. Wait again for temporal separation
 * 7. Create third account action with even later timestamp
 * 8. Test created_after filter (retrieve actions after first timestamp)
 * 9. Test created_before filter (retrieve actions before last timestamp)
 * 10. Test combined date range filter (between two timestamps)
 * 11. Validate all results match expected temporal criteria
 */
export async function test_api_account_action_filter_by_date_range(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePassword123!",
      username: RandomGenerator.alphaNumeric(8),
      href: "https://test.example.com/moderator/join",
      referrer: "https://test.example.com/home",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create multiple members as enforcement targets
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "MemberPass123!",
      username: RandomGenerator.alphaNumeric(8),
      href: "https://test.example.com/member/join",
      referrer: "https://test.example.com/home",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member1);

  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "MemberPass123!",
      username: RandomGenerator.alphaNumeric(8),
      href: "https://test.example.com/member/join",
      referrer: "https://test.example.com/home",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member2);

  const member3 = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "MemberPass123!",
      username: RandomGenerator.alphaNumeric(8),
      href: "https://test.example.com/member/join",
      referrer: "https://test.example.com/home",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member3);

  // Step 3: Create first account action and capture timestamp
  await new Promise((resolve) => setTimeout(resolve, 200)); // Delay for temporal separation

  const action1 =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: {
          discussion_board_member_id: member1.id,
          action_type: "suspension",
          reason: "First test suspension for date filtering",
          duration_days: 7,
        } satisfies IDiscussionBoardAccountAction.ICreate,
      },
    );
  typia.assert(action1);
  const timestamp1 = action1.created_at;

  // Step 4: Wait for temporal separation
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Step 5: Create second account action with later timestamp
  const action2 =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: {
          discussion_board_member_id: member2.id,
          action_type: "ban",
          reason: "Second test ban for date filtering",
        } satisfies IDiscussionBoardAccountAction.ICreate,
      },
    );
  typia.assert(action2);
  const timestamp2 = action2.created_at;

  // Step 6: Wait again for temporal separation
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Step 7: Create third account action with even later timestamp
  const action3 =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: {
          discussion_board_member_id: member3.id,
          action_type: "suspension",
          reason: "Third test suspension for date filtering",
          duration_days: 14,
        } satisfies IDiscussionBoardAccountAction.ICreate,
      },
    );
  typia.assert(action3);
  const timestamp3 = action3.created_at;

  // Step 8: Test created_after filter - should return actions on or after timestamp1
  const afterFilter =
    await api.functional.discussionBoard.moderator.accountActions.index(
      connection,
      {
        body: {
          created_after: timestamp1,
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(afterFilter);

  TestValidator.predicate(
    "created_after filter returns at least the 3 created actions",
    afterFilter.data.length >= 3,
  );

  // Validate all returned actions have created_at >= timestamp1
  for (const action of afterFilter.data) {
    TestValidator.predicate(
      "action created_at is on or after timestamp1",
      new Date(action.created_at).getTime() >= new Date(timestamp1).getTime(),
    );
  }

  // Step 9: Test created_before filter - should return actions on or before timestamp3
  const beforeFilter =
    await api.functional.discussionBoard.moderator.accountActions.index(
      connection,
      {
        body: {
          created_before: timestamp3,
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(beforeFilter);

  TestValidator.predicate(
    "created_before filter returns at least the 3 created actions",
    beforeFilter.data.length >= 3,
  );

  // Validate all returned actions have created_at <= timestamp3
  for (const action of beforeFilter.data) {
    TestValidator.predicate(
      "action created_at is on or before timestamp3",
      new Date(action.created_at).getTime() <= new Date(timestamp3).getTime(),
    );
  }

  // Step 10: Test combined date range filter - should return actions between timestamp1 and timestamp3
  const rangeFilter =
    await api.functional.discussionBoard.moderator.accountActions.index(
      connection,
      {
        body: {
          created_after: timestamp1,
          created_before: timestamp3,
        } satisfies IDiscussionBoardAccountAction.IRequest,
      },
    );
  typia.assert(rangeFilter);

  TestValidator.predicate(
    "date range filter returns at least the 3 created actions",
    rangeFilter.data.length >= 3,
  );

  // Validate all returned actions are within the date range
  for (const action of rangeFilter.data) {
    const actionTime = new Date(action.created_at).getTime();
    const afterTime = new Date(timestamp1).getTime();
    const beforeTime = new Date(timestamp3).getTime();

    TestValidator.predicate(
      "action created_at is within date range",
      actionTime >= afterTime && actionTime <= beforeTime,
    );
  }

  // Step 11: Verify specific actions are present in range results
  const actionIds = rangeFilter.data.map((a) => a.id);
  TestValidator.predicate(
    "range filter includes action1",
    actionIds.includes(action1.id),
  );
  TestValidator.predicate(
    "range filter includes action2",
    actionIds.includes(action2.id),
  );
  TestValidator.predicate(
    "range filter includes action3",
    actionIds.includes(action3.id),
  );
}
