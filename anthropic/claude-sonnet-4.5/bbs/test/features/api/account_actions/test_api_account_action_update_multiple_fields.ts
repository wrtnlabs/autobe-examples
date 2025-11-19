import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountAction";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test updating multiple fields of an account action simultaneously including
 * duration, reason, and status.
 *
 * This test validates the partial update functionality allowing moderators to
 * modify multiple aspects of enforcement actions in a single atomic operation.
 * A moderator creates a member account, applies a 1-day suspension, then
 * performs a comprehensive update changing the duration to 30 days, updating
 * the reason to reflect escalated violation severity, while keeping status as
 * 'active'.
 *
 * Steps:
 *
 * 1. Create and authenticate moderator account
 * 2. Create member account to be suspended
 * 3. Create initial 1-day suspension action
 * 4. Update multiple fields: duration (30 days), reason (escalated), status
 *    (active)
 * 5. Verify all updated fields are applied correctly
 * 6. Verify expires_at timestamp is recalculated based on new duration
 * 7. Verify no data inconsistency exists
 */
export async function test_api_account_action_update_multiple_fields(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create member account to be suspended
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "member123",
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 5 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Create initial 1-day suspension action
  const initialReason = "Initial violation - inappropriate language";
  const initialAction =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: {
          discussion_board_member_id: member.id,
          action_type: "suspension",
          reason: initialReason,
          duration_days: 1,
        } satisfies IDiscussionBoardAccountAction.ICreate,
      },
    );
  typia.assert(initialAction);

  // Verify initial action properties
  TestValidator.equals(
    "initial action type",
    initialAction.action_type,
    "suspension",
  );
  TestValidator.equals("initial duration", initialAction.duration_days, 1);
  TestValidator.equals("initial reason", initialAction.reason, initialReason);
  TestValidator.equals("initial status", initialAction.status, "active");

  // Step 4: Update multiple fields simultaneously
  const updatedReason =
    "Escalated violation - repeated inappropriate language and harassment of other members";
  const updatedAction =
    await api.functional.discussionBoard.moderator.accountActions.update(
      connection,
      {
        actionId: initialAction.id,
        body: {
          duration_days: 30,
          reason: updatedReason,
          status: "active",
        } satisfies IDiscussionBoardAccountAction.IUpdate,
      },
    );
  typia.assert(updatedAction);

  // Step 5: Verify all updated fields are applied correctly
  TestValidator.equals(
    "updated duration is 30 days",
    updatedAction.duration_days,
    30,
  );
  TestValidator.equals(
    "updated reason reflects escalation",
    updatedAction.reason,
    updatedReason,
  );
  TestValidator.equals("status remains active", updatedAction.status, "active");
  TestValidator.equals(
    "action type unchanged",
    updatedAction.action_type,
    "suspension",
  );
  TestValidator.equals(
    "action ID unchanged",
    updatedAction.id,
    initialAction.id,
  );

  // Step 6: Verify expires_at timestamp is recalculated based on new duration
  const createdAt = new Date(updatedAction.created_at);
  const expectedExpiresAt = new Date(
    createdAt.getTime() + 30 * 24 * 60 * 60 * 1000,
  );

  if (
    updatedAction.expires_at !== null &&
    updatedAction.expires_at !== undefined
  ) {
    const actualExpiresAt = new Date(updatedAction.expires_at);
    const timeDifference = Math.abs(
      actualExpiresAt.getTime() - expectedExpiresAt.getTime(),
    );

    // Allow 1 second tolerance for timestamp calculation differences
    TestValidator.predicate(
      "expires_at recalculated correctly for 30 days",
      timeDifference < 1000,
    );
  }

  // Step 7: Verify data consistency - all fields present and valid
  TestValidator.predicate(
    "moderator ID present",
    typeof updatedAction.discussion_board_moderator_id === "string",
  );
  TestValidator.predicate(
    "member ID matches target",
    updatedAction.discussion_board_member_id === member.id,
  );
  TestValidator.predicate(
    "created_at unchanged",
    updatedAction.created_at === initialAction.created_at,
  );
  TestValidator.predicate(
    "reversal fields remain null",
    updatedAction.reversed_at === null ||
      updatedAction.reversed_at === undefined,
  );
}
