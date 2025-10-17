import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test password change operation with current password verification.
 *
 * This test validates that a moderator can successfully change their password
 * by providing correct current password verification. The test creates a new
 * moderator account, performs a password change operation, and validates that
 * the password change succeeds with proper confirmation.
 *
 * Test Flow:
 *
 * 1. Create a new moderator account and establish an authenticated session
 * 2. Change the password using current password verification
 * 3. Validate that the password change returns success confirmation
 * 4. Verify the current session remains authenticated after password change
 * 5. Test that incorrect current password is rejected
 *
 * Note: Full session invalidation testing requires login endpoints which are
 * not available in the current API. This test focuses on the password change
 * operation itself and validates proper current password verification.
 */
export async function test_api_moderator_password_change_session_invalidation(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const initialPassword = "SecurePass123!";
  const newPassword = "NewSecurePass456!";

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

  // Verify the moderator was created with correct data
  TestValidator.equals(
    "username matches",
    moderator.username,
    moderatorData.username,
  );
  TestValidator.equals("email matches", moderator.email, moderatorData.email);
  TestValidator.equals(
    "email not verified initially",
    moderator.email_verified,
    false,
  );
  TestValidator.predicate(
    "token access exists",
    moderator.token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh exists",
    moderator.token.refresh.length > 0,
  );

  // Step 2: Change the password using the current session with correct current password
  const passwordChangeRequest = {
    current_password: initialPassword,
    new_password: newPassword,
    new_password_confirmation: newPassword,
  } satisfies IRedditLikeModerator.IPasswordChange;

  const changeResult: IRedditLikeModerator.IPasswordChangeConfirmation =
    await api.functional.auth.moderator.password.change.changePassword(
      connection,
      {
        body: passwordChangeRequest,
      },
    );

  typia.assert(changeResult);

  // Step 3: Validate password change confirmation
  TestValidator.equals("password change success", changeResult.success, true);
  TestValidator.predicate(
    "confirmation message exists",
    changeResult.message.length > 0,
  );

  // Step 4: Test that incorrect current password is rejected
  await TestValidator.error(
    "incorrect current password should fail",
    async () => {
      await api.functional.auth.moderator.password.change.changePassword(
        connection,
        {
          body: {
            current_password: "WrongPassword123!",
            new_password: "AnotherNewPass789!",
            new_password_confirmation: "AnotherNewPass789!",
          } satisfies IRedditLikeModerator.IPasswordChange,
        },
      );
    },
  );

  // Step 5: Test that password confirmation mismatch is rejected
  await TestValidator.error(
    "password confirmation mismatch should fail",
    async () => {
      await api.functional.auth.moderator.password.change.changePassword(
        connection,
        {
          body: {
            current_password: newPassword,
            new_password: "YetAnotherPass999!",
            new_password_confirmation: "DifferentPass000!",
          } satisfies IRedditLikeModerator.IPasswordChange,
        },
      );
    },
  );
}
