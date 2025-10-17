import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test successful moderator password change workflow.
 *
 * This test validates the complete password change process for an authenticated
 * moderator account. The workflow includes:
 *
 * 1. Create and authenticate a new moderator account
 * 2. Change the password with valid current password and new password
 * 3. Verify the password change confirmation response
 *
 * The test ensures that moderators can securely update their credentials and
 * that the password change process works correctly with proper validation.
 */
export async function test_api_moderator_password_change_with_valid_credentials(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const initialPassword = "SecurePass123!";
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: initialPassword,
  } satisfies IRedditLikeModerator.ICreate;

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Verify the moderator was created successfully
  TestValidator.equals(
    "moderator username matches",
    moderator.username,
    moderatorData.username,
  );
  TestValidator.equals(
    "moderator email matches",
    moderator.email,
    moderatorData.email,
  );
  TestValidator.predicate("moderator has valid ID", moderator.id.length > 0);

  // Step 2: Change the password
  const newPassword = "NewSecurePass456!";
  const passwordChangeData = {
    current_password: initialPassword,
    new_password: newPassword,
    new_password_confirmation: newPassword,
  } satisfies IRedditLikeModerator.IPasswordChange;

  const changeConfirmation: IRedditLikeModerator.IPasswordChangeConfirmation =
    await api.functional.auth.moderator.password.change.changePassword(
      connection,
      {
        body: passwordChangeData,
      },
    );
  typia.assert(changeConfirmation);

  // Step 3: Verify the password change confirmation
  TestValidator.equals(
    "password change success",
    changeConfirmation.success,
    true,
  );
  TestValidator.predicate(
    "confirmation message exists",
    changeConfirmation.message.length > 0,
  );
}
