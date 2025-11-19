import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPasswordReset";

/**
 * Test error handling when retrieving a non-existent password reset record.
 *
 * This test validates that the API properly handles requests for password reset
 * records that do not exist in the database. It ensures the system returns an
 * appropriate error response rather than throwing unhandled exceptions.
 *
 * Steps:
 *
 * 1. Register and authenticate as a moderator
 * 2. Attempt to retrieve a password reset using a non-existent UUID
 * 3. Verify that the API returns an error response indicating the resource was not
 *    found
 */
export async function test_api_password_reset_retrieval_nonexistent_id(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "SecurePassword123!",
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Attempt to retrieve password reset with non-existent UUID
  const nonExistentResetId =
    "00000000-0000-0000-0000-000000000000" satisfies string &
      tags.Format<"uuid">;

  // Step 3: Verify that the API returns an error for non-existent resource
  await TestValidator.error(
    "should return error when retrieving non-existent password reset",
    async () => {
      await api.functional.discussionBoard.moderator.passwordResets.at(
        connection,
        {
          resetId: nonExistentResetId,
        },
      );
    },
  );
}
