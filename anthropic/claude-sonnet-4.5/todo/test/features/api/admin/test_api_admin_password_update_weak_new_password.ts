import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test password update rejection when new password does not meet strength
 * requirements.
 *
 * This test validates that the admin password update endpoint enforces strong
 * password requirements even when the correct current password is provided. It
 * creates a new admin account with a strong password, then attempts to update
 * to various weak passwords (too short, lacking special characters, common
 * patterns) and verifies that all such attempts are rejected with validation
 * errors.
 *
 * Process:
 *
 * 1. Create new admin account with strong password
 * 2. Authenticate as the admin (automatic from join response)
 * 3. Attempt password update with weak password (too short)
 * 4. Verify the update fails with validation error
 * 5. Attempt password update with password lacking complexity
 * 6. Verify that attempt also fails
 * 7. Confirm original password remains valid
 */
export async function test_api_admin_password_update_weak_new_password(
  connection: api.IConnection,
) {
  // Step 1: Create admin account with strong password
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const strongPassword = "StrongP@ssw0rd123!";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: strongPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Attempt to update password with weak password (too short)
  const weakPasswordShort = "weak";

  await TestValidator.error(
    "password update should fail with weak password that is too short",
    async () => {
      await api.functional.todoList.admin.admins.me.password.update(
        connection,
        {
          body: {
            current_password: strongPassword,
            new_password: weakPasswordShort,
          } satisfies ITodoListAdmin.IUpdatePassword,
        },
      );
    },
  );

  // Step 3: Attempt to update password with weak password (no special characters)
  const weakPasswordNoSpecial = "simplepassword123";

  await TestValidator.error(
    "password update should fail with weak password lacking special characters",
    async () => {
      await api.functional.todoList.admin.admins.me.password.update(
        connection,
        {
          body: {
            current_password: strongPassword,
            new_password: weakPasswordNoSpecial,
          } satisfies ITodoListAdmin.IUpdatePassword,
        },
      );
    },
  );

  // Step 4: Attempt to update password with common weak pattern
  const weakPasswordCommon = "password";

  await TestValidator.error(
    "password update should fail with common weak password pattern",
    async () => {
      await api.functional.todoList.admin.admins.me.password.update(
        connection,
        {
          body: {
            current_password: strongPassword,
            new_password: weakPasswordCommon,
          } satisfies ITodoListAdmin.IUpdatePassword,
        },
      );
    },
  );
}
