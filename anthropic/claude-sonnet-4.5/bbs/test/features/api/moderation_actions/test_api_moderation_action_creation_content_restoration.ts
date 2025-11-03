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
 * Test creating a moderation action audit log entry for content restoration.
 *
 * This scenario validates that moderators can document content restoration
 * actions, supporting recovery from incorrect deletions or successful appeals.
 *
 * Workflow:
 *
 * 1. Create a new moderator account using join
 * 2. Create a moderation action with action_type 'restore_content', target_type
 *    'comment', reason explaining why content is being restored (e.g., appeal
 *    successful, deletion error), and detailed notes about the restoration
 *    decision
 * 3. Validate the response contains the created restoration action
 * 4. Verify the audit trail documents the restoration for complete history
 * 5. Confirm the action supports accountability by recording moderator decisions
 *    to reverse previous actions
 * 6. Validate all contextual information is preserved
 */
export async function test_api_moderation_action_creation_content_restoration(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(12);
  const moderatorPassword = RandomGenerator.alphaNumeric(16);

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: moderatorPassword,
        href: "https://example.com/moderator/join",
        referrer: "https://example.com/moderator/login",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a moderation action for content restoration
  const targetCommentId = typia.random<string & tags.Format<"uuid">>();
  const restorationReason =
    "Appeal successful - original deletion was made in error. Content review shows no policy violations.";
  const restorationDetails =
    "After careful review of the user's appeal and re-examination of the comment content, it was determined that the original deletion was an overreaction. The comment contains legitimate criticism that does not violate community guidelines on respectful discourse. The moderator who originally deleted this content has been notified of this reversal decision for training purposes.";

  const moderationAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderation.actions.create(
      connection,
      {
        body: {
          related_report_id: null,
          action_type: "restore_content",
          target_type: "comment",
          target_id: targetCommentId,
          reason: restorationReason,
          details: restorationDetails,
        } satisfies IDiscussionBoardModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // Step 3: Validate the response contains the created restoration action
  TestValidator.equals(
    "moderation action type should be restore_content",
    moderationAction.action_type,
    "restore_content",
  );

  TestValidator.equals(
    "target type should be comment",
    moderationAction.target_type,
    "comment",
  );

  TestValidator.equals(
    "target ID matches the comment being restored",
    moderationAction.target_id,
    targetCommentId,
  );

  TestValidator.equals(
    "restoration reason matches input",
    moderationAction.reason,
    restorationReason,
  );

  TestValidator.equals(
    "restoration details match input",
    moderationAction.details,
    restorationDetails,
  );

  // Step 4: Verify the audit trail is complete
  TestValidator.equals(
    "moderator ID matches authenticated moderator",
    moderationAction.discussion_board_moderator_id,
    moderator.id,
  );

  TestValidator.equals(
    "related report ID is null for proactive restoration",
    moderationAction.related_report_id,
    null,
  );

  // Step 5: Confirm moderator summary information is present
  TestValidator.equals(
    "moderator summary username matches",
    moderationAction.moderator.username,
    moderatorUsername,
  );

  TestValidator.equals(
    "moderator summary ID matches",
    moderationAction.moderator.id,
    moderator.id,
  );
}
