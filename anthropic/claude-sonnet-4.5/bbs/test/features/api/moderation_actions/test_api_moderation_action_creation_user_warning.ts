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
 * Test creating a moderation action audit log entry for user warning.
 *
 * This test validates the complete workflow for documenting user warning
 * interventions in the discussion board moderation system. It ensures that
 * moderators can create comprehensive audit trail records when issuing warnings
 * to users as part of the progressive discipline system.
 *
 * Workflow:
 *
 * 1. Create and authenticate a new moderator account
 * 2. Create a moderation action documenting a user warning
 * 3. Validate the complete moderation action response structure
 * 4. Verify moderator attribution and audit trail completeness
 * 5. Confirm all necessary information for accountability is captured
 */
export async function test_api_moderation_action_creation_user_warning(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: moderatorEmail,
        password: "SecurePass123!@#",
        display_name: RandomGenerator.name(2),
        bio: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 8,
        }),
        location: RandomGenerator.name(1),
        website_url: `https://${RandomGenerator.alphaNumeric(8)}.example.com`,
        profile_picture_url: `https://cdn.example.com/avatars/${RandomGenerator.alphaNumeric(16)}.jpg`,
        href: "https://discussion.example.com/moderator/join",
        referrer: "https://discussion.example.com/home",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a moderation action for user warning
  const targetUserId = typia.random<string & tags.Format<"uuid">>();
  const warningReasons = [
    "spam",
    "harassment",
    "off-topic",
    "inappropriate_language",
  ] as const;
  const selectedReason = RandomGenerator.pick(warningReasons);

  const moderationAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderation.actions.create(
      connection,
      {
        body: {
          action_type: "warn_user",
          target_type: "user",
          target_id: targetUserId,
          reason: `User violation: ${selectedReason}`,
          details: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies IDiscussionBoardModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // Step 3: Validate complete moderation action response structure
  TestValidator.equals(
    "action type is warn_user",
    moderationAction.action_type,
    "warn_user",
  );

  TestValidator.equals(
    "target type is user",
    moderationAction.target_type,
    "user",
  );

  TestValidator.equals(
    "target ID matches the warned user",
    moderationAction.target_id,
    targetUserId,
  );

  TestValidator.predicate(
    "reason is properly recorded",
    moderationAction.reason.includes(selectedReason),
  );

  TestValidator.predicate(
    "details field is populated",
    moderationAction.details !== null &&
      moderationAction.details !== undefined &&
      moderationAction.details.length > 0,
  );

  // Step 4: Verify moderator attribution
  TestValidator.equals(
    "moderator ID matches authenticated moderator",
    moderationAction.discussion_board_moderator_id,
    moderator.id,
  );

  TestValidator.equals(
    "moderator summary username matches",
    moderationAction.moderator.username,
    moderator.username,
  );

  TestValidator.equals(
    "moderator summary ID matches",
    moderationAction.moderator.id,
    moderator.id,
  );
}
