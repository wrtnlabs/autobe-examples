import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test password update rejection when incorrect current password is provided.
 *
 * This test validates a critical security feature that protects administrator
 * accounts from unauthorized password changes. Even with an authenticated
 * session, password modifications require verification of the current
 * password.
 *
 * Security Scenario: An attacker who gains access to an authenticated admin
 * session (through session hijacking, XSS, or physical access to an unlocked
 * device) should NOT be able to change the account password without knowing the
 * current password. This security layer prevents complete account takeover.
 *
 * Test Flow:
 *
 * 1. Create a new admin account with a known password "originalPassword123"
 * 2. Attempt to update password with incorrect current password "wrongPassword456"
 * 3. Verify that the operation fails with appropriate error
 * 4. Confirm password remains unchanged (not tested to keep focus on error case)
 */
export async function test_api_admin_password_update_wrong_current(
  connection: api.IConnection,
) {
  // Step 1: Create a new admin account with known credentials
  const originalPassword = "originalPassword123";
  const adminEmail = typia.random<string & tags.Format<"email">>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: originalPassword,
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Attempt to update password with INCORRECT current password
  // This should fail because the current_password does not match
  await TestValidator.error(
    "password update with wrong current password should fail",
    async () => {
      await api.functional.todoList.admin.admins.me.password.update(
        connection,
        {
          body: {
            current_password: "wrongPassword456",
            new_password: "newPassword789",
          } satisfies ITodoListAdmin.IUpdatePassword,
        },
      );
    },
  );
}
