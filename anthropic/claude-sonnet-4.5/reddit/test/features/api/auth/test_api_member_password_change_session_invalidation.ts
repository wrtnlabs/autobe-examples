import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

/**
 * Test password change functionality with basic validation.
 *
 * This test validates the password change endpoint works correctly. Due to API
 * limitations (no login endpoint available), we cannot fully test the
 * multi-session invalidation requirement. This test validates:
 *
 * 1. Create a new member account (establishes authenticated session)
 * 2. Successfully change the password with correct current password
 * 3. Verify password change response indicates success
 *
 * Note: Complete multi-session invalidation testing would require:
 *
 * - A login endpoint to create multiple sessions for the same user
 * - Additional authenticated endpoints to verify session validity These are not
 *   available in the current API surface.
 */
export async function test_api_member_password_change_session_invalidation(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account with initial session
  const password = "SecurePass123!@#";
  const newPassword = "NewSecurePass456!@#";

  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: password,
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Verify member was created successfully
  TestValidator.predicate(
    "member account created successfully",
    member.id !== undefined && member.username === memberData.username,
  );

  // Step 2: Change the password using correct current password
  const passwordChangeRequest = {
    current_password: password,
    new_password: newPassword,
    new_password_confirmation: newPassword,
  } satisfies IRedditLikeMember.IChangePassword;

  const passwordChangeResult: IRedditLikeMember.IPasswordChanged =
    await api.functional.auth.member.password.change.changePassword(
      connection,
      {
        body: passwordChangeRequest,
      },
    );

  // Step 3: Verify password change was successful
  typia.assert(passwordChangeResult);
  TestValidator.equals(
    "password change success flag",
    passwordChangeResult.success,
    true,
  );
  TestValidator.predicate(
    "password change confirmation message exists",
    passwordChangeResult.message !== undefined &&
      passwordChangeResult.message.length > 0,
  );

  // Step 4: Verify that using incorrect current password fails
  await TestValidator.error(
    "password change with incorrect current password should fail",
    async () => {
      await api.functional.auth.member.password.change.changePassword(
        connection,
        {
          body: {
            current_password: "WrongPassword123!@#",
            new_password: "AnotherNewPass789!@#",
            new_password_confirmation: "AnotherNewPass789!@#",
          } satisfies IRedditLikeMember.IChangePassword,
        },
      );
    },
  );

  // Step 5: Verify that mismatched new password confirmation fails
  await TestValidator.error(
    "password change with mismatched confirmation should fail",
    async () => {
      await api.functional.auth.member.password.change.changePassword(
        connection,
        {
          body: {
            current_password: newPassword,
            new_password: "YetAnotherPass999!@#",
            new_password_confirmation: "DifferentPass999!@#",
          } satisfies IRedditLikeMember.IChangePassword,
        },
      );
    },
  );
}
