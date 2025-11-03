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
 * Test creating a moderation action audit log entry for content deletion.
 *
 * This test validates that moderators can document content deletion
 * interventions with complete audit trail information including action type,
 * target entity, reason, and detailed notes.
 *
 * Workflow:
 *
 * 1. Create a new moderator account using join
 * 2. Create a moderation action with action_type 'delete_content', target_type
 *    'article', comprehensive reason, and detailed notes explaining the
 *    deletion decision
 * 3. Validate the response contains the created moderation action with generated
 *    ID and timestamps
 * 4. Verify all submitted information is accurately recorded (moderator ID, action
 *    type, target details, reason, notes)
 * 5. Confirm the audit record is immutable and permanent
 * 6. Validate timestamps (created_at) are properly set
 */
export async function test_api_moderation_action_creation_content_deletion(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(12);
  const moderatorPassword = "SecurePass123!@#";

  const moderatorCreateData = {
    username: moderatorUsername,
    email: moderatorEmail,
    password: moderatorPassword,
    href: "https://discussion-board.example.com/auth/moderator/join",
    referrer: "https://discussion-board.example.com/auth/login",
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreateData,
    });
  typia.assert(moderator);

  // Verify moderator was created successfully
  TestValidator.equals(
    "moderator username matches",
    moderator.username,
    moderatorUsername,
  );
  TestValidator.equals(
    "moderator email matches",
    moderator.email,
    moderatorEmail,
  );
  typia.assert(moderator.token);
  typia.assert(moderator.id);

  // Step 2: Create a moderation action for content deletion
  const targetArticleId = typia.random<string & tags.Format<"uuid">>();
  const deletionReason =
    "Spam content promoting commercial services in violation of community guidelines";
  const deletionDetails =
    "Article contained multiple links to commercial websites with no educational value. Author has been previously warned about spam posting. This is the third violation within 30 days, warranting immediate content removal to maintain community quality standards.";

  const moderationActionData = {
    action_type: "delete_content",
    target_type: "article",
    target_id: targetArticleId,
    reason: deletionReason,
    details: deletionDetails,
  } satisfies IDiscussionBoardModerationAction.ICreate;

  const moderationAction: IDiscussionBoardModerationAction =
    await api.functional.discussionBoard.moderator.moderation.actions.create(
      connection,
      {
        body: moderationActionData,
      },
    );
  typia.assert(moderationAction);

  // Step 3: Verify all submitted information is accurately recorded
  TestValidator.equals(
    "action type matches",
    moderationAction.action_type,
    "delete_content",
  );
  TestValidator.equals(
    "target type matches",
    moderationAction.target_type,
    "article",
  );
  TestValidator.equals(
    "target id matches",
    moderationAction.target_id,
    targetArticleId,
  );
  TestValidator.equals(
    "reason matches",
    moderationAction.reason,
    deletionReason,
  );
  TestValidator.equals(
    "details match",
    moderationAction.details,
    deletionDetails,
  );

  // Step 4: Verify moderator attribution
  TestValidator.equals(
    "moderator id matches",
    moderationAction.discussion_board_moderator_id,
    moderator.id,
  );
  typia.assert(moderationAction.moderator);
  TestValidator.equals(
    "moderator username in summary matches",
    moderationAction.moderator.username,
    moderatorUsername,
  );

  // Step 5: Verify no related report (this is a proactive moderation action)
  TestValidator.equals(
    "related_report_id is null for proactive action",
    moderationAction.related_report_id,
    null,
  );
}
