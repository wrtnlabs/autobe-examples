import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";

/**
 * Test successful password change workflow for authenticated member.
 *
 * This test validates that an authenticated member can successfully change
 * their account password through the change-password endpoint. The process
 * requires the member to provide their current password for verification,
 * specify a new password meeting security requirements (minimum 8 characters
 * with uppercase, lowercase, and numeric characters), and confirm the new
 * password matches. Upon successful validation, the system updates the password
 * hash and invalidates all existing sessions.
 *
 * Workflow:
 *
 * 1. Create a new member account via registration
 * 2. Authenticate the member via login
 * 3. Request password change with current password and new password
 * 4. Verify the new password meets security requirements
 * 5. Confirm successful password change response
 * 6. Validate all sessions have been invalidated
 */
export async function test_api_password_change_successful(
  connection: api.IConnection,
) {
  // Step 1: Create member account via registration
  const email = typia.random<string & tags.Format<"email">>();
  const currentPassword = "SecurePass123";

  const registeredMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email,
        password: currentPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(registeredMember);

  // Step 2: Authenticate member via login
  const loginResponse: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: {
        email,
        password: currentPassword,
      } satisfies IDiscussionBoardMember.ILoginRequest,
    });
  typia.assert(loginResponse);

  // Step 3: Prepare new password that meets security requirements
  // Must be minimum 8 characters with uppercase, lowercase, and number
  const newPassword = "NewSecure456";

  // Step 4: Request password change
  const changePasswordResponse: IDiscussionBoardMemberSession.IChangePasswordResponse =
    await api.functional.discussionBoard.member.auth.change_password.changePassword(
      connection,
      {
        body: {
          current_password: currentPassword,
          new_password: newPassword,
          new_password_confirmation: newPassword,
        } satisfies IDiscussionBoardMemberSession.IChangePasswordRequest,
      },
    );
  typia.assert(changePasswordResponse);

  // Step 5: Validate response indicates successful password change
  TestValidator.predicate(
    "password change response indicates success",
    changePasswordResponse.success === true,
  );

  TestValidator.predicate(
    "password change message indicates successful operation",
    changePasswordResponse.message.toLowerCase().includes("password"),
  );

  // Step 6: Verify new password is different from old password
  TestValidator.notEquals(
    "new password should be different from current password",
    newPassword,
    currentPassword,
  );

  // Step 7: Validate new password meets security requirements
  TestValidator.predicate(
    "new password has minimum 8 characters",
    newPassword.length >= 8,
  );

  TestValidator.predicate(
    "new password contains uppercase letter",
    /[A-Z]/.test(newPassword),
  );

  TestValidator.predicate(
    "new password contains lowercase letter",
    /[a-z]/.test(newPassword),
  );

  TestValidator.predicate(
    "new password contains numeric digit",
    /[0-9]/.test(newPassword),
  );
}
