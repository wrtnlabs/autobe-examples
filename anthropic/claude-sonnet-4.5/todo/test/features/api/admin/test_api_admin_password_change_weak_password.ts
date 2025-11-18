import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test comprehensive password strength validation for admin password changes.
 *
 * This test validates that the password change endpoint properly enforces all
 * password strength requirements for administrative accounts. After creating an
 * admin account with a valid strong password, the test attempts to change the
 * password using various weak passwords that violate different security
 * requirements.
 *
 * Test scenarios include passwords that are:
 *
 * 1. Too short (less than 8 characters)
 * 2. Missing uppercase letters
 * 3. Missing lowercase letters
 * 4. Missing numeric digits
 * 5. Missing special characters
 *
 * Each violation should be properly detected and rejected by the API, ensuring
 * administrative accounts maintain strong security through enforced password
 * complexity requirements.
 */
export async function test_api_admin_password_change_weak_password(
  connection: api.IConnection,
) {
  // Step 1: Register admin account with valid strong password
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const validPassword = "ValidPass123!";

  const registrationBody = {
    email: adminEmail,
    password: validPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListAdmin.ICreate;

  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: registrationBody,
    });
  typia.assert(admin);

  // Step 2: Test weak password - too short (less than 8 characters)
  await TestValidator.error("password too short should fail", async () => {
    await api.functional.todoList.admin.admins.me.update(connection, {
      body: {
        current_password: validPassword,
        new_password: "Short1!",
      } satisfies ITodoListAdmin.IUpdate,
    });
  });

  // Step 3: Test weak password - missing uppercase letters
  await TestValidator.error(
    "password missing uppercase should fail",
    async () => {
      await api.functional.todoList.admin.admins.me.update(connection, {
        body: {
          current_password: validPassword,
          new_password: "lowercase123!",
        } satisfies ITodoListAdmin.IUpdate,
      });
    },
  );

  // Step 4: Test weak password - missing lowercase letters
  await TestValidator.error(
    "password missing lowercase should fail",
    async () => {
      await api.functional.todoList.admin.admins.me.update(connection, {
        body: {
          current_password: validPassword,
          new_password: "UPPERCASE123!",
        } satisfies ITodoListAdmin.IUpdate,
      });
    },
  );

  // Step 5: Test weak password - missing numeric digits
  await TestValidator.error(
    "password missing numbers should fail",
    async () => {
      await api.functional.todoList.admin.admins.me.update(connection, {
        body: {
          current_password: validPassword,
          new_password: "NoNumbers!",
        } satisfies ITodoListAdmin.IUpdate,
      });
    },
  );

  // Step 6: Test weak password - missing special characters
  await TestValidator.error(
    "password missing special characters should fail",
    async () => {
      await api.functional.todoList.admin.admins.me.update(connection, {
        body: {
          current_password: validPassword,
          new_password: "NoSpecial123",
        } satisfies ITodoListAdmin.IUpdate,
      });
    },
  );
}
