import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test that admin can change a user's email address and the user must use the
 * new email for subsequent authentication.
 *
 * This test validates that when an admin updates a user's email address:
 *
 * 1. Admin registers and authenticates
 * 2. Regular user registers with initial email address
 * 3. Admin updates the user's email to a new address
 * 4. The email change is persisted in the system
 * 5. User can authenticate with the new email address
 * 6. User cannot authenticate with the old email address
 *
 * This ensures proper credential update enforcement and prevents unauthorized
 * access with old credentials.
 */
export async function test_api_admin_user_email_change_updates_login_credential(
  connection: api.IConnection,
) {
  // Step 1: Admin registers and authenticates
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123";
  const adminRegisterBody = {
    email: adminEmail,
    password: adminPassword,
    password_confirmation: adminPassword,
  } satisfies ITodoAppAdmin.IRegister;

  const adminAuthorized: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminRegisterBody,
    });
  typia.assert(adminAuthorized);
  TestValidator.equals(
    "admin email matches",
    adminAuthorized.email,
    adminEmail,
  );
  TestValidator.equals(
    "admin status is active",
    adminAuthorized.status,
    "active",
  );

  // Step 2: Regular user registers with initial email address
  const initialUserEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const userPassword = "UserPassword123";
  const userRegisterBody = {
    email: initialUserEmail,
    password: userPassword,
  } satisfies ITodoAppUser.IJoin;

  const userAuthorized: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userRegisterBody,
    });
  typia.assert(userAuthorized);
  const userId = userAuthorized.id;
  TestValidator.equals(
    "initial user email matches",
    userAuthorized.email,
    initialUserEmail,
  );

  // Step 3: Admin updates the user's email to a new address
  const newUserEmail: string = typia.random<string & tags.Format<"email">>();
  const updateUserBody = {
    email: newUserEmail,
  } satisfies ITodoAppUser.IUpdate;

  const updatedUser: ITodoAppUser =
    await api.functional.todoApp.admin.users.update(connection, {
      userId: userId,
      body: updateUserBody,
    });
  typia.assert(updatedUser);

  // Step 4: Verify the email change is persisted
  TestValidator.equals(
    "updated user email matches new email",
    updatedUser.email,
    newUserEmail,
  );
  TestValidator.notEquals(
    "updated email differs from initial email",
    updatedUser.email,
    initialUserEmail,
  );
  TestValidator.equals(
    "user status remains active",
    updatedUser.status,
    "active",
  );

  // Step 5: User can authenticate with the new email address
  // Create a new connection for user login testing
  const userLoginConnection: api.IConnection = { ...connection, headers: {} };

  const userLoginWithNewEmail: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(userLoginConnection, {
      body: {
        email: newUserEmail,
        password: userPassword,
      } satisfies ITodoAppUser.IJoin,
    });
  typia.assert(userLoginWithNewEmail);
  TestValidator.equals(
    "user login with new email succeeds",
    userLoginWithNewEmail.email,
    newUserEmail,
  );
  TestValidator.equals(
    "logged in user ID matches",
    userLoginWithNewEmail.id,
    userId,
  );

  // Step 6: User cannot authenticate with the old email address
  const oldEmailLoginConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "user cannot login with old email address",
    async () => {
      await api.functional.auth.user.join(oldEmailLoginConnection, {
        body: {
          email: initialUserEmail,
          password: userPassword,
        } satisfies ITodoAppUser.IJoin,
      });
    },
  );
}
