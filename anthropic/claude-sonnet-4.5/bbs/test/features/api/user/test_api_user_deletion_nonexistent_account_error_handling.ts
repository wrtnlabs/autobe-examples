import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";

/**
 * Test error handling when attempting to delete a nonexistent user account.
 *
 * This test validates that the discussion board API correctly handles attempts
 * to delete user accounts that don't exist in the system. The test ensures
 * proper error responses are returned when administrators try to delete
 * nonexistent users.
 *
 * Steps:
 *
 * 1. Create an administrator account through join endpoint
 * 2. Generate a valid UUID that doesn't correspond to any existing user
 * 3. Attempt to delete the nonexistent user account
 * 4. Verify appropriate error handling occurs
 */
export async function test_api_user_deletion_nonexistent_account_error_handling(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate administrator account
  const adminCredentials = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCredentials,
    });
  typia.assert(admin);

  // Step 2: Generate a valid UUID that doesn't correspond to any existing user
  const nonexistentUserId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Attempt to delete the nonexistent user account and verify error
  await TestValidator.error(
    "deleting nonexistent user should fail",
    async () => {
      await api.functional.discussionBoard.administrator.users.erase(
        connection,
        {
          userId: nonexistentUserId,
        },
      );
    },
  );
}
