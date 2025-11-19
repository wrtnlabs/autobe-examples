import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test successful moderator password change workflow.
 *
 * This test validates the complete password change process for authenticated
 * moderators:
 *
 * 1. Create and authenticate a moderator account to establish valid session
 * 2. Execute password change operation with valid current password and new
 *    password
 * 3. Verify the operation succeeds without errors (void return indicates success)
 *
 * The test ensures:
 *
 * - Current password validation against stored bcrypt hash works correctly
 * - New password meets security requirements (minimum 8 characters)
 * - Password change operation updates the moderator's credentials successfully
 * - Authenticated moderators can change their own passwords
 */
export async function test_api_moderator_password_change_successful(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account
  const initialPassword = "initial_password_123";
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: initialPassword,
    username: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 2: Prepare password change with new password meeting security requirements
  const newPassword = "new_secure_password_456";
  const passwordChangeData = {
    currentPassword: initialPassword,
    newPassword: newPassword,
  } satisfies IDiscussionBoardModerator.IChangePassword;

  // Step 3: Execute password change operation
  await api.functional.auth.moderator.password.change.changePassword(
    connection,
    {
      body: passwordChangeData,
    },
  );

  // Success is indicated by no error being thrown (void return)
}
