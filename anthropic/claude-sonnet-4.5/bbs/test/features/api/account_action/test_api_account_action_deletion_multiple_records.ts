import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test deleting multiple account action records to validate cleanup of
 * enforcement history.
 *
 * This scenario demonstrates batch deletion workflow for cleaning up multiple
 * obsolete or erroneous records. The test creates a moderator account and then
 * creates several account actions (3+ suspensions) against a member. The
 * moderator then deletes each action record one by one using separate DELETE
 * requests with each action's UUID.
 *
 * Validation verifies that each deletion succeeds independently, that each
 * deleted record is returned for confirmation, and that all deletions are
 * properly processed. This validates that the deletion endpoint can handle
 * multiple sequential deletion requests without issues and maintains data
 * consistency throughout the cleanup process.
 *
 * Steps:
 *
 * 1. Create moderator account for deletion workflow
 * 2. Create multiple account action records (3+ suspensions)
 * 3. Delete each action record sequentially
 * 4. Verify each deletion returns the deleted record
 * 5. Confirm all deletions succeed without errors
 */
export async function test_api_account_action_deletion_multiple_records(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create multiple account action records (3 suspensions)
  const memberIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );

  const createdActions = await ArrayUtil.asyncMap(
    memberIds,
    async (memberId) => {
      const action =
        await api.functional.discussionBoard.moderator.accountActions.create(
          connection,
          {
            body: {
              discussion_board_member_id: memberId,
              action_type: "suspension",
              reason: RandomGenerator.paragraph({
                sentences: 2,
                wordMin: 5,
                wordMax: 10,
              }),
              duration_days: RandomGenerator.pick([1, 7, 14, 30] as const),
            } satisfies IDiscussionBoardAccountAction.ICreate,
          },
        );
      typia.assert(action);
      return action;
    },
  );

  TestValidator.equals("created 3 account actions", createdActions.length, 3);

  // Step 3 & 4: Delete each action record sequentially and verify deletion
  const deletedActions = await ArrayUtil.asyncMap(
    createdActions,
    async (action) => {
      const deleted =
        await api.functional.discussionBoard.moderator.accountActions.erase(
          connection,
          {
            actionId: action.id,
          },
        );
      typia.assert(deleted);

      // Verify the deleted record matches the original
      TestValidator.equals(
        "deleted action ID matches original",
        deleted.id,
        action.id,
      );

      TestValidator.equals(
        "deleted action member ID matches",
        deleted.discussion_board_member_id,
        action.discussion_board_member_id,
      );

      return deleted;
    },
  );

  // Step 5: Confirm all deletions succeeded
  TestValidator.equals(
    "all 3 actions were deleted successfully",
    deletedActions.length,
    3,
  );

  // Verify each deleted action was returned with complete information
  deletedActions.forEach((deleted, index) => {
    TestValidator.predicate(
      `deleted action ${index + 1} has valid structure`,
      deleted.id !== null && deleted.id !== undefined,
    );
  });
}
