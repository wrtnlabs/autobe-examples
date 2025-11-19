import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test error handling when attempting to retrieve a non-existent account
 * action.
 *
 * This test validates that the API properly handles requests to retrieve
 * account actions with valid UUID format but non-existent IDs. The test flow:
 *
 * 1. Authenticate as a moderator to obtain valid credentials
 * 2. Generate a valid UUID format that doesn't correspond to any existing action
 * 3. Attempt to retrieve the non-existent account action
 * 4. Verify that an appropriate error response is returned
 *
 * The test ensures the API provides clear error communication rather than
 * returning null or empty responses for invalid actionId parameters.
 */
export async function test_api_account_action_retrieve_nonexistent_action(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "securePassword123",
        username: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Generate a valid UUID that doesn't exist in the system
  const nonExistentActionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 3: Attempt to retrieve the non-existent account action
  // This should result in an error being thrown
  await TestValidator.error(
    "should fail when retrieving non-existent account action",
    async () => {
      await api.functional.discussionBoard.moderator.accountActions.at(
        connection,
        {
          actionId: nonExistentActionId,
        },
      );
    },
  );
}
