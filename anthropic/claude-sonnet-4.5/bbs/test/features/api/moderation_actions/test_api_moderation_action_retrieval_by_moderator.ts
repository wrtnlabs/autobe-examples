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
 * Test that a moderator can successfully retrieve detailed information about a
 * specific moderation action by its unique identifier.
 *
 * This test validates the complete audit trail workflow where moderators need
 * to review past enforcement decisions for accountability, appeal processing,
 * or training purposes. It creates a moderator account, authenticates them,
 * creates a moderation action record, then retrieves that specific action by
 * its ID to verify all details are accurately returned including moderator
 * identity, action type, target information, reason, and timestamps.
 */
export async function test_api_moderation_action_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(10);
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: moderatorUsername,
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://discussion-board.example.com/moderator/join",
      referrer: "https://discussion-board.example.com/",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a moderation action record
  const actionTypes = [
    "warn_user",
    "delete_content",
    "suspend_user",
    "edit_content",
  ] as const;
  const targetTypes = ["article", "comment", "user"] as const;

  const createdAction =
    await api.functional.discussionBoard.moderator.moderation.actions.create(
      connection,
      {
        body: {
          action_type: RandomGenerator.pick(actionTypes),
          target_type: RandomGenerator.pick(targetTypes),
          target_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 10,
          }),
          details: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IDiscussionBoardModerationAction.ICreate,
      },
    );
  typia.assert(createdAction);

  // Step 3: Retrieve the moderation action by its ID
  const retrievedAction =
    await api.functional.discussionBoard.moderator.moderation.actions.at(
      connection,
      {
        actionId: createdAction.id,
      },
    );
  typia.assert(retrievedAction);

  // Step 4: Validate all returned fields match the created action
  TestValidator.equals(
    "action ID matches",
    retrievedAction.id,
    createdAction.id,
  );
  TestValidator.equals(
    "action type matches",
    retrievedAction.action_type,
    createdAction.action_type,
  );
  TestValidator.equals(
    "target type matches",
    retrievedAction.target_type,
    createdAction.target_type,
  );
  TestValidator.equals(
    "target ID matches",
    retrievedAction.target_id,
    createdAction.target_id,
  );
  TestValidator.equals(
    "reason matches",
    retrievedAction.reason,
    createdAction.reason,
  );
  TestValidator.equals(
    "details match",
    retrievedAction.details,
    createdAction.details,
  );

  // Step 5: Verify moderator information is properly included
  TestValidator.equals(
    "moderator ID matches",
    retrievedAction.discussion_board_moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "moderator username in summary",
    retrievedAction.moderator.username,
    moderator.username,
  );
}
