import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

/**
 * Validate that a non-super admin cannot promote another admin to super.
 *
 * Business rationale:
 *
 * - Promotion to super-admin is a privileged operation. The test verifies that a
 *   non-super admin cannot perform the promotion and that a true super-admin
 *   can perform it (proving the operation is privilege-guarded).
 *
 * Steps:
 *
 * 1. Create a non-super admin (the caller) using POST /auth/admin/join. The SDK
 *    will populate connection.headers.Authorization for subsequent calls.
 * 2. Create a target admin using an unauthenticated connection clone so the main
 *    connection's Authorization token is not overwritten.
 * 3. Create a super-admin using another unauthenticated connection clone.
 * 4. As the non-super admin, attempt to update the target's is_super flag; expect
 *    an error (operation rejected).
 * 5. As the super-admin, perform the same update; expect success and verify the
 *    returned summary indicates is_super === true.
 */
export async function test_api_admin_update_is_super_by_non_super_admin_forbidden(
  connection: api.IConnection,
) {
  // 1) Create a non-super admin (caller) -> this will populate connection.headers.Authorization
  const nonSuperEmail: string = typia.random<string & tags.Format<"email">>();
  const nonSuper: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: nonSuperEmail,
        password: RandomGenerator.alphaNumeric(12),
        is_super: false,
      } satisfies ITodoAppAdmin.ICreate,
    });
  typia.assert(nonSuper);

  // 2) Create the target admin using an unauthenticated connection clone
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const targetEmail: string = typia.random<string & tags.Format<"email">>();
  const target: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(unauthConn, {
      body: {
        email: targetEmail,
        password: RandomGenerator.alphaNumeric(12),
        is_super: false,
      } satisfies ITodoAppAdmin.ICreate,
    });
  typia.assert(target);

  // 3) Create a super-admin using another unauthenticated connection clone
  const superConn: api.IConnection = { ...connection, headers: {} };
  const superEmail: string = typia.random<string & tags.Format<"email">>();
  const superAdmin: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(superConn, {
      body: {
        email: superEmail,
        password: RandomGenerator.alphaNumeric(12),
        is_super: true,
      } satisfies ITodoAppAdmin.ICreate,
    });
  typia.assert(superAdmin);

  // 4) As non-super admin (connection has nonSuper token), attempt to set is_super=true -> expect error
  await TestValidator.error(
    "non-super admin cannot promote another admin to super",
    async () => {
      await api.functional.todoApp.admin.admins.update(connection, {
        adminId: target.id,
        body: {
          is_super: true,
        } satisfies ITodoAppAdmin.IUpdate,
      });
    },
  );

  // 5) As super-admin, perform the same update and expect success
  const updated: ITodoAppAdmin.ISummary =
    await api.functional.todoApp.admin.admins.update(superConn, {
      adminId: target.id,
      body: {
        is_super: true,
      } satisfies ITodoAppAdmin.IUpdate,
    });
  typia.assert(updated);
  TestValidator.equals(
    "super-admin can promote target to is_super",
    updated.is_super,
    true,
  );
}
