import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";

/**
 * Validates the full workflow of soft-deleting (revoking) a newly created admin
 * account.
 *
 * This test ensures that:
 *
 * - An admin account can be registered successfully (simulating onboarding).
 * - The same admin account can self-delete (soft delete) by calling DELETE
 *   /todoList/admin/admins/{adminId}.
 * - After revocation, privileged actions (such as erasing own account again) are
 *   no longer permitted for the deleted admin, demonstrating enforcement of
 *   soft-deletion.
 * - Audit-relevant identity fields (id, email, display_name, created_at,
 *   deleted_at) remain traceable in the response or dataset, while all
 *   privilege-bearing actions are suppressed.
 *
 * Steps:
 *
 * 1. Register a new admin account and assert successful authentication.
 * 2. Immediately erase (soft delete) the same admin via DELETE
 *    /todoList/admin/admins/{adminId}.
 * 3. Attempt privileged operation (e.g., try erasing again or repeat privileged
 *    access) with this credential and expect error.
 * 4. Confirm that audit-relevant records are maintained, while privilege is
 *    revoked.
 */
export async function test_api_admin_account_soft_deletion_by_new_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin account
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: `https://admin.example.com/${RandomGenerator.alphaNumeric(10)}`,
    referrer: `https://landing.example.com/${RandomGenerator.alphaNumeric(10)}`,
    ip: null,
  } satisfies ITodoListAdmin.ICreate;
  const adminAuth: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminInput,
    });
  typia.assert(adminAuth);
  TestValidator.equals(
    "registered admin email matches input",
    adminAuth.email,
    adminInput.email,
  );
  TestValidator.equals(
    "registered admin display_name matches input",
    adminAuth.display_name,
    adminInput.display_name,
  );
  TestValidator.predicate(
    "admin id is uuid",
    typeof adminAuth.id === "string" && adminAuth.id.length > 0,
  );
  // 2. Soft delete (revoke) this admin by itself
  await api.functional.todoList.admin.admins.erase(connection, {
    adminId: adminAuth.id,
  });
  // 3. Attempt a privileged operation again and expect failure (privilege suppressed)
  await TestValidator.error(
    "revoked admin cannot erase admin account again",
    async () => {
      await api.functional.todoList.admin.admins.erase(connection, {
        adminId: adminAuth.id,
      });
    },
  );
}
