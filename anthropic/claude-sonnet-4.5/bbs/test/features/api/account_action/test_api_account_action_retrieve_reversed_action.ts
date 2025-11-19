import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountAction";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test retrieving details of an action that was reversed by a moderator.
 *
 * This test validates the complete lifecycle of a reversed account action:
 *
 * 1. Moderator authenticates and creates their account
 * 2. A member account is created to be the target of the suspension
 * 3. Moderator applies a suspension action to the member
 * 4. Moderator reverses the suspension with a documented reason
 * 5. Retrieve the action record and validate reversal details
 *
 * The test ensures that reversed actions maintain complete audit trails with:
 *
 * - Status showing 'reversed'
 * - Populated reversed_at timestamp
 * - Correct reversed_by_moderator_id reference
 * - Documented reversal_reason
 * - Preserved original action details (created_at, duration_days, reason)
 */
export async function test_api_account_action_retrieve_reversed_action(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string>(),
    username: typia.random<string>(),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 2: Create member account that will receive the suspension
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    username: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 3: Moderator creates a suspension action
  const suspensionData = {
    discussion_board_member_id: member.id,
    action_type: "suspension" as const,
    reason: "Spam violation detected in multiple posts",
    duration_days: 7 as const,
  } satisfies IDiscussionBoardAccountAction.ICreate;

  const createdAction =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: suspensionData,
      },
    );
  typia.assert(createdAction);

  // Validate initial action state
  TestValidator.equals(
    "action type is suspension",
    createdAction.action_type,
    "suspension",
  );
  TestValidator.equals(
    "initial status is active",
    createdAction.status,
    "active",
  );
  TestValidator.equals("duration is 7 days", createdAction.duration_days, 7);

  // Step 4: Moderator reverses the suspension with documented reason
  const reversalData = {
    status: "reversed" as const,
    reversal_reason:
      "Suspension applied in error - user was incorrectly identified",
  } satisfies IDiscussionBoardAccountAction.IUpdate;

  const reversedAction =
    await api.functional.discussionBoard.moderator.accountActions.update(
      connection,
      {
        actionId: createdAction.id,
        body: reversalData,
      },
    );
  typia.assert(reversedAction);

  // Step 5: Retrieve the action and validate all reversal details
  const retrievedAction =
    await api.functional.discussionBoard.moderator.accountActions.at(
      connection,
      {
        actionId: createdAction.id,
      },
    );
  typia.assert(retrievedAction);

  // Validate reversal fields
  TestValidator.equals(
    "status is reversed",
    retrievedAction.status,
    "reversed",
  );

  TestValidator.predicate(
    "reversed_at timestamp is populated",
    retrievedAction.reversed_at !== null &&
      retrievedAction.reversed_at !== undefined,
  );

  TestValidator.equals(
    "reversed_by_moderator_id references the moderator",
    retrievedAction.reversed_by_moderator_id,
    moderator.id,
  );

  TestValidator.equals(
    "reversal_reason contains documented explanation",
    retrievedAction.reversal_reason,
    "Suspension applied in error - user was incorrectly identified",
  );

  // Validate original action details are preserved for audit trail
  TestValidator.equals(
    "action_type preserved",
    retrievedAction.action_type,
    "suspension",
  );
  TestValidator.equals(
    "original reason preserved",
    retrievedAction.reason,
    suspensionData.reason,
  );
  TestValidator.equals(
    "duration_days preserved",
    retrievedAction.duration_days,
    7,
  );
  TestValidator.equals(
    "member_id preserved",
    retrievedAction.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "moderator_id preserved",
    retrievedAction.discussion_board_moderator_id,
    moderator.id,
  );

  TestValidator.predicate(
    "created_at timestamp is preserved",
    retrievedAction.created_at !== null &&
      retrievedAction.created_at !== undefined,
  );
}
