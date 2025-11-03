import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";

/**
 * Test password change rejection when new password fails strength requirements.
 *
 * Validates that the password change endpoint properly enforces password
 * security requirements and rejects weak passwords. The system must validate
 * that new passwords:
 *
 * - Contain minimum 8 characters
 * - Include at least one uppercase letter (A-Z)
 * - Include at least one lowercase letter (a-z)
 * - Include at least one numeric digit (0-9)
 *
 * The test creates a member account, authenticates, and attempts password
 * changes with various weak password combinations, verifying proper rejection
 * of each.
 *
 * Test flow:
 *
 * 1. Create member account with strong password
 * 2. Authenticate to obtain authorization token
 * 3. Test rejection of passwords with insufficient length
 * 4. Test rejection of passwords missing uppercase letters
 * 5. Test rejection of passwords missing lowercase letters
 * 6. Test rejection of passwords missing numeric digits
 * 7. Test rejection when new password matches current password
 * 8. Test rejection when confirmation doesn't match new password
 * 9. Verify successful change with valid strong password
 */
export async function test_api_password_change_weak_password(
  connection: api.IConnection,
) {
  // Step 1: Create a member account with strong password
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const currentPassword = "StrongPassword123";

  const registeredMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: currentPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(registeredMember);
  TestValidator.predicate(
    "member registration successful",
    registeredMember.id !== null && registeredMember.token !== null,
  );

  // Step 2: Authenticate member to obtain authorization token
  const loginResponse: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: {
        email: memberEmail,
        password: currentPassword,
      } satisfies IDiscussionBoardMember.ILoginRequest,
    });
  typia.assert(loginResponse);
  TestValidator.equals(
    "authenticated member token exists",
    loginResponse.token !== null,
    true,
  );

  // Step 3: Test rejection of password with insufficient length (less than 8 characters)
  await TestValidator.error(
    "reject password with insufficient length",
    async () => {
      await api.functional.discussionBoard.member.auth.change_password.changePassword(
        connection,
        {
          body: {
            current_password: currentPassword,
            new_password: "Short1A",
            new_password_confirmation: "Short1A",
          } satisfies IDiscussionBoardMemberSession.IChangePasswordRequest,
        },
      );
    },
  );

  // Step 4: Test rejection of password missing uppercase letters
  await TestValidator.error(
    "reject password without uppercase letters",
    async () => {
      await api.functional.discussionBoard.member.auth.change_password.changePassword(
        connection,
        {
          body: {
            current_password: currentPassword,
            new_password: "lowercaseonly123",
            new_password_confirmation: "lowercaseonly123",
          } satisfies IDiscussionBoardMemberSession.IChangePasswordRequest,
        },
      );
    },
  );

  // Step 5: Test rejection of password missing lowercase letters
  await TestValidator.error(
    "reject password without lowercase letters",
    async () => {
      await api.functional.discussionBoard.member.auth.change_password.changePassword(
        connection,
        {
          body: {
            current_password: currentPassword,
            new_password: "UPPERCASEONLY123",
            new_password_confirmation: "UPPERCASEONLY123",
          } satisfies IDiscussionBoardMemberSession.IChangePasswordRequest,
        },
      );
    },
  );

  // Step 6: Test rejection of password missing numeric digits
  await TestValidator.error(
    "reject password without numeric digits",
    async () => {
      await api.functional.discussionBoard.member.auth.change_password.changePassword(
        connection,
        {
          body: {
            current_password: currentPassword,
            new_password: "NoDigitsHere",
            new_password_confirmation: "NoDigitsHere",
          } satisfies IDiscussionBoardMemberSession.IChangePasswordRequest,
        },
      );
    },
  );

  // Step 7: Test rejection when new password matches current password
  await TestValidator.error(
    "reject when new password is identical to current password",
    async () => {
      await api.functional.discussionBoard.member.auth.change_password.changePassword(
        connection,
        {
          body: {
            current_password: currentPassword,
            new_password: currentPassword,
            new_password_confirmation: currentPassword,
          } satisfies IDiscussionBoardMemberSession.IChangePasswordRequest,
        },
      );
    },
  );

  // Step 8: Test rejection when confirmation doesn't match new password
  await TestValidator.error(
    "reject when password confirmation does not match",
    async () => {
      await api.functional.discussionBoard.member.auth.change_password.changePassword(
        connection,
        {
          body: {
            current_password: currentPassword,
            new_password: "ValidPassword123",
            new_password_confirmation: "DifferentPassword456",
          } satisfies IDiscussionBoardMemberSession.IChangePasswordRequest,
        },
      );
    },
  );

  // Step 9: Verify successful password change with valid strong password
  const newValidPassword = "NewStrongPassword456";
  const successResponse: IDiscussionBoardMemberSession.IChangePasswordResponse =
    await api.functional.discussionBoard.member.auth.change_password.changePassword(
      connection,
      {
        body: {
          current_password: currentPassword,
          new_password: newValidPassword,
          new_password_confirmation: newValidPassword,
        } satisfies IDiscussionBoardMemberSession.IChangePasswordRequest,
      },
    );
  typia.assert(successResponse);
  TestValidator.equals(
    "password change success response",
    successResponse.success,
    true,
  );
  TestValidator.predicate(
    "success message present",
    successResponse.message.length > 0,
  );
}
