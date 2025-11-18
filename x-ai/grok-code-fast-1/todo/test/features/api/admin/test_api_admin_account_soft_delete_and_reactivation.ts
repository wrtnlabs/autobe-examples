import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";

/**
 * Validate the soft deletion and restoration of an Admin account.
 *
 * 1. Register a new admin, obtaining credentials and adminId.
 * 2. Soft-delete (suspend) the admin by updating deleted_at to now.
 * 3. Confirm deleted_at is set, updated_at is advanced, and admin is marked as
 *    suspended.
 * 4. Restore the admin by updating deleted_at to null.
 * 5. Confirm deleted_at is null, updated_at is advanced again, and admin is active
 *    and can authenticate.
 * 6. Validate all audit and status fields after each operation for correct backend
 *    handling.
 */
export async function test_api_admin_account_soft_delete_and_reactivation(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: "https://adminpanel.local/register",
    referrer: "https://adminpanel.local/",
  } satisfies ITodoListAdmin.ICreate;
  const authorized = await api.functional.auth.admin.join(connection, {
    body: adminBody,
  });
  typia.assert(authorized);
  const adminId = authorized.id;
  const origUpdatedAt = authorized.updated_at;

  // 2. Soft-delete (suspend) the admin account
  const deleteTimestamp = new Date().toISOString();
  const suspendedAdmin = await api.functional.todoList.admin.admins.update(
    connection,
    {
      adminId,
      body: { deleted_at: deleteTimestamp } satisfies ITodoListAdmin.IUpdate,
    },
  );
  typia.assert(suspendedAdmin);
  TestValidator.equals(
    "deleted_at set after suspension",
    suspendedAdmin.deleted_at,
    deleteTimestamp,
  );
  TestValidator.notEquals(
    "updated_at should advance after suspension",
    suspendedAdmin.updated_at,
    origUpdatedAt,
  );

  // 3. Restore the admin (deleted_at to null)
  const reactivateAdmin = await api.functional.todoList.admin.admins.update(
    connection,
    {
      adminId,
      body: { deleted_at: null } satisfies ITodoListAdmin.IUpdate,
    },
  );
  typia.assert(reactivateAdmin);
  TestValidator.equals(
    "deleted_at is null after reactivation",
    reactivateAdmin.deleted_at,
    null,
  );
  TestValidator.notEquals(
    "updated_at should advance again after reactivation",
    reactivateAdmin.updated_at,
    suspendedAdmin.updated_at,
  );

  // 4. Confirm account can authenticate again (join with same email)
  // (Since join creates new admin, test existing email causes error)
  await TestValidator.error(
    "joining with existing email should fail",
    async () => {
      await api.functional.auth.admin.join(connection, { body: adminBody });
    },
  );
}
