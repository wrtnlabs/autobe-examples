import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test the permanent deletion of account action records for administrative
 * cleanup.
 *
 * This test validates that moderators can permanently delete account action
 * records from the enforcement history. The deletion is a hard delete operation
 * that completely removes the record from the database, useful for cleaning up
 * erroneous entries or duplicate records.
 *
 * Test Flow:
 *
 * 1. Create moderator account with authentication
 * 2. Apply a suspension action to a member (using random member UUID)
 * 3. Delete the account action record permanently
 * 4. Validate deletion returns the complete deleted record
 * 5. Verify the record cannot be deleted again (already removed)
 */
export async function test_api_account_action_deletion_for_cleanup(
  connection: api.IConnection,
) {
  // Step 1: Create moderator who will manage account actions
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePass123!",
        username: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create an account action (suspension) against a member
  // Using random UUID for member ID since member creation API is not available
  const targetMemberId = typia.random<string & tags.Format<"uuid">>();

  const accountAction: IDiscussionBoardAccountAction =
    await api.functional.discussionBoard.moderator.accountActions.create(
      connection,
      {
        body: {
          discussion_board_member_id: targetMemberId,
          action_type: "suspension",
          reason:
            "Test suspension for cleanup testing - this record will be deleted for administrative purposes",
          duration_days: 7,
        } satisfies IDiscussionBoardAccountAction.ICreate,
      },
    );
  typia.assert(accountAction);

  // Validate the created account action
  TestValidator.equals(
    "action type is suspension",
    accountAction.action_type,
    "suspension",
  );
  TestValidator.equals(
    "action status is active",
    accountAction.status,
    "active",
  );
  TestValidator.equals(
    "target member ID matches",
    accountAction.discussion_board_member_id,
    targetMemberId,
  );
  TestValidator.equals("duration is 7 days", accountAction.duration_days, 7);

  // Step 3: Permanently delete the account action record
  const deletedAction: IDiscussionBoardAccountAction =
    await api.functional.discussionBoard.moderator.accountActions.erase(
      connection,
      {
        actionId: accountAction.id,
      },
    );
  typia.assert(deletedAction);

  // Step 4: Validate deletion returns the complete deleted record as confirmation
  TestValidator.equals(
    "deleted action ID matches original",
    deletedAction.id,
    accountAction.id,
  );
  TestValidator.equals(
    "deleted action member ID matches",
    deletedAction.discussion_board_member_id,
    accountAction.discussion_board_member_id,
  );
  TestValidator.equals(
    "deleted action type matches",
    deletedAction.action_type,
    accountAction.action_type,
  );
  TestValidator.equals(
    "deleted action reason matches",
    deletedAction.reason,
    accountAction.reason,
  );
  TestValidator.equals(
    "deleted action duration matches",
    deletedAction.duration_days,
    accountAction.duration_days,
  );
  TestValidator.equals(
    "deleted action status matches",
    deletedAction.status,
    accountAction.status,
  );

  // Step 5: Verify the record is permanently removed from database
  // Attempting to delete the same action again should fail since it no longer exists
  await TestValidator.error(
    "deleting already deleted action should fail",
    async () => {
      await api.functional.discussionBoard.moderator.accountActions.erase(
        connection,
        {
          actionId: accountAction.id,
        },
      );
    },
  );
}
