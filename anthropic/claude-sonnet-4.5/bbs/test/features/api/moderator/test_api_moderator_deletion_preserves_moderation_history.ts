import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";
import type { IDiscussionBoardUserWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserWarning";

/**
 * Test that soft deleting a moderator preserves their historical moderation
 * actions for audit purposes.
 *
 * This scenario validates that moderation_actions, user_warnings, and
 * user_suspensions records maintain their references to the deleted moderator.
 * The test creates a moderator, has them perform various moderation actions
 * (create warnings, suspensions, moderation action logs), then soft deletes the
 * moderator account. It verifies that all historical records remain accessible
 * and still reference the deleted moderator's ID, ensuring complete audit trail
 * preservation even after account deletion.
 */
export async function test_api_moderator_deletion_preserves_moderation_history(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create member accounts that will receive moderation actions
  const member1Data = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member1: IDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.members.create(connection, {
      body: member1Data,
    });
  typia.assert(member1);

  const member2Data = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member2: IDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.members.create(connection, {
      body: member2Data,
    });
  typia.assert(member2);

  // Step 3: Create moderation action logs
  const moderationAction1Data = {
    action_type: "warn_user",
    target_type: "user",
    target_id: member1.id,
    reason: "Spam content violation",
    details: "User posted promotional content multiple times",
  } satisfies IDiscussionBoardModerationAction.ICreate;

  const moderationAction1: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderation.actions.create(
      connection,
      {
        body: moderationAction1Data,
      },
    );
  typia.assert(moderationAction1);

  const moderationAction2Data = {
    action_type: "suspend_user",
    target_type: "user",
    target_id: member2.id,
    reason: "Repeated harassment",
    details: "User engaged in personal attacks after previous warnings",
  } satisfies IDiscussionBoardModerationAction.ICreate;

  const moderationAction2: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderation.actions.create(
      connection,
      {
        body: moderationAction2Data,
      },
    );
  typia.assert(moderationAction2);

  // Step 4: Create user warnings
  const warningData = {
    discussion_board_member_id: member1.id,
    related_moderation_action_id: moderationAction1.id,
    warning_reason: "spam",
    warning_details:
      "Posted promotional content in violation of community guidelines",
    severity: "moderate",
  } satisfies IDiscussionBoardUserWarning.ICreate;

  const warning: IDiscussionBoardUserWarning =
    await api.functional.discussionBoard.moderator.moderation.warnings.create(
      connection,
      {
        body: warningData,
      },
    );
  typia.assert(warning);

  // Step 5: Create user suspensions
  const suspensionData = {
    discussion_board_member_id: member2.id,
    related_moderation_action_id: moderationAction2.id,
    suspension_reason: "harassment",
    suspension_details: "Engaged in personal attacks against other members",
    suspended_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  } satisfies IDiscussionBoardUserSuspension.ICreate;

  const suspension: IDiscussionBoardUserSuspension =
    await api.functional.discussionBoard.moderator.moderation.suspensions.create(
      connection,
      {
        body: suspensionData,
      },
    );
  typia.assert(suspension);

  // Step 6: Verify all records reference the moderator before deletion
  TestValidator.equals(
    "warning references moderator",
    warning.discussion_board_moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "suspension references moderator",
    suspension.suspending_moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "moderation action 1 references moderator",
    moderationAction1.discussion_board_moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "moderation action 2 references moderator",
    moderationAction2.discussion_board_moderator_id,
    moderator.id,
  );

  // Step 7: Soft delete the moderator account
  const deletedModerator: IDiscussionBoardModerator =
    await api.functional.discussionBoard.moderator.moderators.erase(
      connection,
      {
        moderatorUsername: moderator.username,
      },
    );
  typia.assert(deletedModerator);

  // Step 8: Verify the moderator is soft deleted (deleted_at is set)
  TestValidator.predicate(
    "moderator has deleted_at timestamp",
    deletedModerator.deleted_at !== null &&
      deletedModerator.deleted_at !== undefined,
  );

  // Step 9: Verify all historical records still reference the deleted moderator's ID
  TestValidator.equals(
    "warning still references deleted moderator ID",
    warning.discussion_board_moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "suspension still references deleted moderator ID",
    suspension.suspending_moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "moderation action 1 still references deleted moderator ID",
    moderationAction1.discussion_board_moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "moderation action 2 still references deleted moderator ID",
    moderationAction2.discussion_board_moderator_id,
    moderator.id,
  );

  // Step 10: Verify the deleted moderator's username is preserved
  TestValidator.equals(
    "deleted moderator username preserved",
    deletedModerator.username,
    moderator.username,
  );
}
