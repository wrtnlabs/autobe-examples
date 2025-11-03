import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Test creating a moderation action audit log entry for user suspension.
 *
 * This test validates that moderators can document user suspension enforcement
 * actions with complete justification and context. The workflow creates a new
 * moderator account, then creates a moderation action documenting a user
 * suspension with detailed reasoning.
 *
 * Steps:
 *
 * 1. Create a new moderator account using join endpoint
 * 2. Create a moderation action with action_type 'suspend_user' and target_type
 *    'user'
 * 3. Validate the response contains complete audit information
 * 4. Verify the suspension action is permanently logged with moderator identity
 * 5. Confirm comprehensive notes are captured for appeal review
 */
export async function test_api_moderation_action_creation_suspension(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account for authentication
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(8),
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

  // Step 2: Create moderation action documenting user suspension
  const targetUserId = typia.random<string & tags.Format<"uuid">>();
  const suspensionReason =
    "Repeated violations of community guidelines including harassment and spam";
  const suspensionDetails =
    "User has received multiple warnings over the past 30 days for harassing other members and posting spam content. Progressive discipline: verbal warning (day 1), written warning (day 15), suspension (day 30). This suspension is for 7 days to allow the user time to review community guidelines. Appeal process available through moderation team.";

  const moderationActionData = {
    action_type: "suspend_user",
    target_type: "user",
    target_id: targetUserId,
    reason: suspensionReason,
    details: suspensionDetails,
    related_report_id: null,
  } satisfies IDiscussionBoardModerationAction.ICreate;

  const moderationAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderation.actions.create(
      connection,
      {
        body: moderationActionData,
      },
    );
  typia.assert(moderationAction);

  // Step 3: Validate the response contains complete audit information
  TestValidator.equals(
    "action type should be suspend_user",
    moderationAction.action_type,
    "suspend_user",
  );

  TestValidator.equals(
    "target type should be user",
    moderationAction.target_type,
    "user",
  );

  TestValidator.equals(
    "target id should match",
    moderationAction.target_id,
    targetUserId,
  );

  TestValidator.equals(
    "reason should be preserved",
    moderationAction.reason,
    suspensionReason,
  );

  TestValidator.equals(
    "details should be preserved",
    moderationAction.details,
    suspensionDetails,
  );

  // Step 4: Verify moderator identity is recorded for accountability
  TestValidator.equals(
    "moderator id should match",
    moderationAction.discussion_board_moderator_id,
    moderator.id,
  );

  TestValidator.equals(
    "moderator username should match",
    moderationAction.moderator.username,
    moderator.username,
  );

  // Step 5: Confirm audit record supports consistency analysis
  TestValidator.predicate(
    "moderation action id should be generated",
    moderationAction.id !== null && moderationAction.id !== undefined,
  );

  TestValidator.predicate(
    "created_at timestamp should be set",
    moderationAction.created_at !== null &&
      moderationAction.created_at !== undefined,
  );

  TestValidator.predicate(
    "updated_at timestamp should be set",
    moderationAction.updated_at !== null &&
      moderationAction.updated_at !== undefined,
  );
}
