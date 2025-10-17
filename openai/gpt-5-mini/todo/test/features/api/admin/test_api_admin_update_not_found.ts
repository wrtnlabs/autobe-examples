import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

/**
 * Test: Admin update on non-existent admin should return error (no side effect)
 *
 * Business context: An authenticated super-admin attempts to update an admin
 * record identified by a syntactically valid but non-existent UUID. The backend
 * should respond with a not-found error and must not produce a successful
 * update side-effect.
 *
 * Steps:
 *
 * 1. Create a super-admin using POST /auth/admin/join (ITodoAppAdmin.ICreate).
 * 2. Generate a valid UUID that does not correspond to any existing admin.
 * 3. Attempt to update that non-existent admin via PUT
 *    /todoApp/admin/admins/:adminId using ITodoAppAdmin.IUpdate body and assert
 *    that the call throws.
 *
 * Notes:
 *
 * - The SDK's join() populates connection.headers.Authorization automatically on
 *   success. Do NOT read or modify connection.headers directly.
 * - No audit-listing endpoint is available in the provided SDK; therefore audit
 *   verification is not implementable here and is documented as a test
 *   limitation.
 */
export async function test_api_admin_update_not_found(
  connection: api.IConnection,
) {
  // 1) Create super-admin (caller)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const superAdmin: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "P@ssw0rd123",
        is_super: true,
      } satisfies ITodoAppAdmin.ICreate,
    });
  typia.assert(superAdmin);

  // Basic sanity check: ensure created account is super
  TestValidator.predicate(
    "created account is super-admin",
    superAdmin.is_super === true,
  );

  // 2) Choose a syntactically valid UUID that is not present in the system
  const nonExistentAdminId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3) As the super-admin, attempt to update the non-existent admin
  // Because the callback is async, we MUST await TestValidator.error
  await TestValidator.error(
    "updating non-existent admin should fail",
    async () => {
      await api.functional.todoApp.admin.admins.update(connection, {
        adminId: nonExistentAdminId,
        body: {
          email: typia.random<string & tags.Format<"email">>(),
        } satisfies ITodoAppAdmin.IUpdate,
      });
    },
  );

  // 4) Note: No audit verification is performed because the SDK does not
  // provide an audit listing endpoint. If such an endpoint existed, the test
  // would assert that no successful-update audit record exists for
  // nonExistentAdminId.
}
