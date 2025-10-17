import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

/**
 * Test: Prevent super-admin from erasing their own account.
 *
 * Business context:
 *
 * - Self-deletion of a super-admin can lock out administrators.
 * - Server policy must prevent an admin from deleting their own account and must
 *   return a policy error (409 Conflict) when such an attempt is made.
 *
 * Test steps:
 *
 * 1. Create a super-admin via POST /auth/admin/join (ITodoAppAdmin.ICreate).
 * 2. Attempt to DELETE /todoApp/admin/admins/{adminId} using the same admin's id.
 *    Expect 409 Conflict.
 * 3. As indirect verification (SDK lacks GET/admin and audit endpoints), try to
 *    create an admin with the same email and expect an error (duplicate email).
 *    This indicates the original account still exists.
 *
 * Notes:
 *
 * - The SDK provided does not expose GET admin or audit retrieval endpoints, so
 *   the test uses duplicate-join failure to infer the original account's
 *   continued existence. If GET/audit endpoints become available, add explicit
 *   assertions for those records.
 */
export async function test_api_admin_erase_self_delete_prevented(
  connection: api.IConnection,
) {
  // 1) Create a super-admin account
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    is_super: true,
  } satisfies ITodoAppAdmin.ICreate;

  const created: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminBody,
    });
  // Runtime type validation
  typia.assert(created);

  // Sanity checks
  TestValidator.equals(
    "created admin is_super flag matches request",
    created.is_super,
    true,
  );
  TestValidator.equals(
    "created admin email matches request",
    created.email,
    adminBody.email,
  );

  // 2) Attempt self-delete: should be prevented by policy (409 Conflict)
  await TestValidator.httpError(
    "self-delete prevented - erase should return 409",
    409,
    async () => {
      await api.functional.todoApp.admin.admins.erase(connection, {
        adminId: created.id,
      });
    },
  );

  // 3) Indirect verification: attempting to create the same admin again should fail
  // If creation fails due to duplicate email, it indicates the original admin still exists.
  await TestValidator.error(
    "duplicate admin email should be rejected",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: adminBody,
      });
    },
  );
}
