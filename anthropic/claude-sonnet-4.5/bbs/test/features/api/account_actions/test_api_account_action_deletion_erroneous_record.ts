import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test deleting an account action that was created in error, demonstrating the
 * error correction use case.
 *
 * This scenario validates that moderators can clean up incorrectly created
 * enforcement records. The test creates a moderator and then creates an account
 * action (suspension) that represents a mistaken enforcement decision. The
 * moderator then deletes the erroneous action record to maintain clean
 * enforcement history.
 *
 * Validation confirms that:
 *
 * 1. The deletion removes the incorrect record completely
 * 2. The deletion returns the complete action details for audit purposes
 * 3. The member's enforcement history no longer includes the erroneous action
 *
 * This demonstrates the administrative cleanup capability while maintaining
 * accountability through deletion logging.
 */
export async function test_api_account_action_deletion_erroneous_record(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for error correction workflow
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecureMod123!";
  const moderatorUsername = RandomGenerator.alphaNumeric(12);
  const currentHref = "https://discussionboard.example.com/moderator/join";
  const referrerHref = "https://discussionboard.example.com/";

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
        display_name: RandomGenerator.name(2),
        ip: "192.168.1.100",
        href: currentHref,
        referrer: referrerHref,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create an erroneous account action (suspension with wrong parameters)
  // This represents a mistake - perhaps the moderator selected the wrong member ID
  const erroneousMemberId = typia.random<string & tags.Format<"uuid">>();
  const erroneousReason =
    "Erroneous suspension - created with incorrect member ID. This action should be deleted.";
  const erroneousDuration = 7;

  const erroneousAction: IDiscussionBoardAccountAction =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: {
          discussion_board_member_id: erroneousMemberId,
          action_type: "suspension",
          reason: erroneousReason,
          duration_days: erroneousDuration,
        } satisfies IDiscussionBoardAccountAction.ICreate,
      },
    );
  typia.assert(erroneousAction);

  // Verify the erroneous action was created with expected properties
  TestValidator.equals(
    "erroneous action type",
    erroneousAction.action_type,
    "suspension",
  );
  TestValidator.equals(
    "erroneous action member ID",
    erroneousAction.discussion_board_member_id,
    erroneousMemberId,
  );
  TestValidator.equals(
    "erroneous action reason",
    erroneousAction.reason,
    erroneousReason,
  );
  TestValidator.equals(
    "erroneous action duration",
    erroneousAction.duration_days,
    erroneousDuration,
  );
  TestValidator.equals(
    "erroneous action status",
    erroneousAction.status,
    "active",
  );

  // Step 3: Delete the erroneous account action record to correct the mistake
  const deletedAction: IDiscussionBoardAccountAction =
    await api.functional.discussionBoard.moderator.accountActions.erase(
      connection,
      {
        actionId: erroneousAction.id,
      },
    );
  typia.assert(deletedAction);

  // Step 4: Validate that deletion returns complete action details for audit purposes
  TestValidator.equals(
    "deleted action ID matches original",
    deletedAction.id,
    erroneousAction.id,
  );
  TestValidator.equals(
    "deleted action member ID preserved",
    deletedAction.discussion_board_member_id,
    erroneousMemberId,
  );
  TestValidator.equals(
    "deleted action type preserved",
    deletedAction.action_type,
    "suspension",
  );
  TestValidator.equals(
    "deleted action reason preserved",
    deletedAction.reason,
    erroneousReason,
  );
  TestValidator.equals(
    "deleted action duration preserved",
    deletedAction.duration_days,
    erroneousDuration,
  );
  TestValidator.equals(
    "deleted action moderator ID preserved",
    deletedAction.discussion_board_moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "deleted action status preserved",
    deletedAction.status,
    erroneousAction.status,
  );
  TestValidator.equals(
    "deleted action created_at preserved",
    deletedAction.created_at,
    erroneousAction.created_at,
  );
}
