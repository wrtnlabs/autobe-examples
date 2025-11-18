import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Validate reactivation of a soft-deleted administrator account via update.
 *
 * - Register admin with unique email and password.
 * - Update (simulate soft delete) by setting deleted_at to a recent date-time.
 *   Expect an error: setting deleted_at directly to non-null is forbidden.
 * - Reactivate via update with deleted_at:null. Should succeed.
 * - Validate deleted_at is null and admin is active.
 */
export async function test_api_admin_account_update_reactivate_soft_deletion(
  connection: api.IConnection,
) {
  // 1. Register admin
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.MinLength<8> = RandomGenerator.alphaNumeric(12);
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: {
      email,
      password,
    } satisfies ITodoListAdmin.IJoin,
  });
  typia.assert(adminAuthorized);

  // 2. Try to soft-delete by direct non-null (forbidden by business rule):
  await TestValidator.error(
    "direct non-null set for deleted_at must be rejected",
    async () => {
      await api.functional.todoList.admin.admins.update(connection, {
        adminId: adminAuthorized.id,
        body: {
          deleted_at: new Date().toISOString(),
        } satisfies ITodoListAdmin.IUpdate,
      });
    },
  );

  // 3. Reactivate by setting deleted_at to null
  const updated = await api.functional.todoList.admin.admins.update(
    connection,
    {
      adminId: adminAuthorized.id,
      body: {
        deleted_at: null,
      } satisfies ITodoListAdmin.IUpdate,
    },
  );
  typia.assert(updated);

  // 4. Validate deleted_at is null and the admin is active
  TestValidator.equals(
    "deleted_at should be null after reactivation",
    updated.deleted_at,
    null,
  );
  TestValidator.equals(
    "admin id remains the same",
    updated.id,
    adminAuthorized.id,
  );
}
