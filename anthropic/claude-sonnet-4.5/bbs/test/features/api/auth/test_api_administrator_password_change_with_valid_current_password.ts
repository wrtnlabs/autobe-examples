import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";

/**
 * Test successful administrator password change with valid current password.
 *
 * This test validates the password change workflow for an authenticated
 * administrator who provides the correct current password. The test ensures
 * that the password change API accepts valid credentials and processes the
 * password update successfully.
 *
 * Steps:
 *
 * 1. Create and authenticate a new administrator account
 * 2. Change the password with valid current password and new password
 * 3. Verify the password change operation returns a success message
 */
export async function test_api_administrator_password_change_with_valid_current_password(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new administrator account
  const originalPassword = "Original@Pass123";
  const adminData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: originalPassword,
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Change the password with valid current password and new password
  const newPassword = "NewSecure@Pass456";
  const changePasswordRequest = {
    current_password: originalPassword,
    new_password: newPassword,
    new_password_confirm: newPassword,
  } satisfies IDiscussionBoardAdministrator.IChangePassword;

  const changeResult: IDiscussionBoardAdministrator.IChangePasswordResult =
    await api.functional.auth.administrator.password.change.changePassword(
      connection,
      {
        body: changePasswordRequest,
      },
    );
  typia.assert(changeResult);

  // Step 3: Verify the password change was successful
  TestValidator.predicate(
    "password change result should contain success message",
    changeResult.message.length > 0,
  );
}
