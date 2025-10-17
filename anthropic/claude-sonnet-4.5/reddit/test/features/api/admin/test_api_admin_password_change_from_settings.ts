import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";

/**
 * Test authenticated administrator password change from account settings.
 *
 * This test validates the complete password change workflow for an
 * authenticated administrator. The test creates an admin account,
 * authenticates, then changes the password by providing the current password
 * for verification and a new password meeting all security requirements.
 *
 * Steps:
 *
 * 1. Create admin account with initial credentials
 * 2. Authenticate as admin (handled automatically by SDK)
 * 3. Successfully change password with correct current password
 * 4. Verify password change response confirms success
 * 5. Test error case with incorrect current password
 */
export async function test_api_admin_password_change_from_settings(
  connection: api.IConnection,
) {
  // Step 1: Create admin account with initial credentials
  const initialPassword = "InitialPass123!";
  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: typia.random<string & tags.Format<"email">>(),
        password: initialPassword,
      } satisfies IRedditLikeAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Authentication is handled automatically by the join endpoint
  // The SDK sets the Authorization header with the access token

  // Step 3: Successfully change password with correct current password
  const newPassword = "NewSecurePass456!";
  const passwordChangeResponse: IRedditLikeAdmin.IPasswordChangeResponse =
    await api.functional.auth.admin.password.change.changePassword(connection, {
      body: {
        current_password: initialPassword,
        new_password: newPassword,
        new_password_confirmation: newPassword,
      } satisfies IRedditLikeAdmin.IPasswordChange,
    });
  typia.assert(passwordChangeResponse);

  // Step 4: Verify password change response confirms success
  TestValidator.equals(
    "password change success flag",
    passwordChangeResponse.success,
    true,
  );
  TestValidator.predicate(
    "password change message exists",
    passwordChangeResponse.message.length > 0,
  );

  // Step 5: Test error case with incorrect current password
  await TestValidator.error(
    "incorrect current password should be rejected",
    async () => {
      await api.functional.auth.admin.password.change.changePassword(
        connection,
        {
          body: {
            current_password: "WrongPassword123!",
            new_password: "AnotherNewPass789!",
            new_password_confirmation: "AnotherNewPass789!",
          } satisfies IRedditLikeAdmin.IPasswordChange,
        },
      );
    },
  );
}
