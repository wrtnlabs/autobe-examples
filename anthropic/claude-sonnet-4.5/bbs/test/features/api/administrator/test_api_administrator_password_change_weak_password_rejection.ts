import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";

/**
 * Test password change weak password rejection.
 *
 * This test validates that the password change endpoint properly enforces
 * password complexity requirements by rejecting weak passwords. It creates an
 * administrator account, then attempts password changes with various weak
 * passwords that violate different security rules.
 *
 * Steps:
 *
 * 1. Create and authenticate an administrator account
 * 2. Attempt password change with password missing uppercase letters
 * 3. Attempt password change with password missing lowercase letters
 * 4. Attempt password change with password missing numbers
 * 5. Attempt password change with password missing special characters
 * 6. Attempt password change with password shorter than 8 characters
 * 7. Verify original password still works by successfully changing to a strong
 *    password
 */
export async function test_api_administrator_password_change_weak_password_rejection(
  connection: api.IConnection,
) {
  const originalPassword = "SecureP@ss123";

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        username:
          RandomGenerator.name(1).toLowerCase() +
          RandomGenerator.alphaNumeric(4),
        email: typia.random<string & tags.Format<"email">>(),
        password: originalPassword,
      } satisfies IDiscussionBoardAdministrator.ICreate,
    });
  typia.assert(admin);

  await TestValidator.error(
    "password without uppercase should fail",
    async () => {
      await api.functional.auth.administrator.password.change.changePassword(
        connection,
        {
          body: {
            current_password: originalPassword,
            new_password: "weakpass123!",
            new_password_confirm: "weakpass123!",
          } satisfies IDiscussionBoardAdministrator.IChangePassword,
        },
      );
    },
  );

  await TestValidator.error(
    "password without lowercase should fail",
    async () => {
      await api.functional.auth.administrator.password.change.changePassword(
        connection,
        {
          body: {
            current_password: originalPassword,
            new_password: "WEAKPASS123!",
            new_password_confirm: "WEAKPASS123!",
          } satisfies IDiscussionBoardAdministrator.IChangePassword,
        },
      );
    },
  );

  await TestValidator.error(
    "password without numbers should fail",
    async () => {
      await api.functional.auth.administrator.password.change.changePassword(
        connection,
        {
          body: {
            current_password: originalPassword,
            new_password: "WeakPass!@#",
            new_password_confirm: "WeakPass!@#",
          } satisfies IDiscussionBoardAdministrator.IChangePassword,
        },
      );
    },
  );

  await TestValidator.error(
    "password without special characters should fail",
    async () => {
      await api.functional.auth.administrator.password.change.changePassword(
        connection,
        {
          body: {
            current_password: originalPassword,
            new_password: "WeakPass123",
            new_password_confirm: "WeakPass123",
          } satisfies IDiscussionBoardAdministrator.IChangePassword,
        },
      );
    },
  );

  await TestValidator.error(
    "password shorter than 8 characters should fail",
    async () => {
      await api.functional.auth.administrator.password.change.changePassword(
        connection,
        {
          body: {
            current_password: originalPassword,
            new_password: "Wp1!",
            new_password_confirm: "Wp1!",
          } satisfies IDiscussionBoardAdministrator.IChangePassword,
        },
      );
    },
  );

  const newStrongPassword = "NewSecure@456";
  const result: IDiscussionBoardAdministrator.IChangePasswordResult =
    await api.functional.auth.administrator.password.change.changePassword(
      connection,
      {
        body: {
          current_password: originalPassword,
          new_password: newStrongPassword,
          new_password_confirm: newStrongPassword,
        } satisfies IDiscussionBoardAdministrator.IChangePassword,
      },
    );
  typia.assert(result);
}
