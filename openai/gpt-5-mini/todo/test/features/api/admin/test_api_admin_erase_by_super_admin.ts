import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

/**
 * Validate that a super-admin can permanently erase another admin account.
 *
 * Business context:
 *
 * - Only super-admins may perform irreversible erase operations on administrative
 *   accounts. The SDK exposes account creation (join) and the erase operation.
 *   Because no GET or audit-listing SDK functions are available, this test
 *   confirms deletion by asserting that a subsequent erase attempt fails
 *   (resource not found).
 *
 * Steps:
 *
 * 1. Create a super-admin via POST /auth/admin/join (is_super: true).
 * 2. Create a target admin via POST /auth/admin/join (regular admin).
 * 3. As the super-admin, call DELETE /todoApp/admin/admins/{adminId} to erase the
 *    target admin. Expect success (no exception).
 * 4. Attempt to erase the same admin again and assert that the operation fails
 *    (throws), demonstrating the resource no longer exists.
 */
export async function test_api_admin_erase_by_super_admin(
  connection: api.IConnection,
) {
  // Create isolated connection objects so join() will store tokens per-connection
  const superConn: api.IConnection = { ...connection, headers: {} };
  const targetConn: api.IConnection = { ...connection, headers: {} };

  // 1) Create super-admin
  const superEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const superPassword = "P@ssw0rd!";
  const superAdmin: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(superConn, {
      body: {
        email: superEmail,
        password: superPassword,
        is_super: true,
      } satisfies ITodoAppAdmin.ICreate,
    });
  // Runtime type validation
  typia.assert(superAdmin);

  // 2) Create target admin (the one to be erased)
  const targetEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const targetPassword = "TargetP@ss1";
  const targetAdmin: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(targetConn, {
      body: {
        email: targetEmail,
        password: targetPassword,
      } satisfies ITodoAppAdmin.ICreate,
    });
  typia.assert(targetAdmin);

  // 3) As super-admin, erase the target admin
  // Note: join() populated superConn.headers.Authorization with the access token
  await api.functional.todoApp.admin.admins.erase(superConn, {
    adminId: targetAdmin.id,
  });

  // 4) Verify that attempting to erase the same admin again fails
  await TestValidator.error(
    "re-deleting the erased admin should fail",
    async () => {
      await api.functional.todoApp.admin.admins.erase(superConn, {
        adminId: targetAdmin.id,
      });
    },
  );

  // Additional sanity: ensure that the join responses contain token info
  typia.assert<IAuthorizationToken>(superAdmin.token);
  typia.assert<IAuthorizationToken>(targetAdmin.token);
}
