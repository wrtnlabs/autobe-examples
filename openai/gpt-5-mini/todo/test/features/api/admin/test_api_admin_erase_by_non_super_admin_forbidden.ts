import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

/**
 * Forbidden erase by non-super admin
 *
 * This E2E test verifies that an administrator without super-admin privileges
 * cannot permanently remove another admin account. The test performs the
 * following steps:
 *
 * 1. Create a non-super admin (caller) using the provided `connection`. The SDK
 *    will attach the returned access token to the supplied connection
 *    automatically.
 * 2. Create a separate target admin using a fresh unauthenticated connection so
 *    that the `connection` remains authenticated as the caller.
 * 3. Attempt to DELETE the target admin as the non-super caller and assert that
 *    the operation fails (error thrown).
 * 4. Confirm the target remains by trying to create another admin with the same
 *    email and asserting that the join fails (duplicate email). This indirect
 *    check demonstrates that no deletion occurred.
 */
export async function test_api_admin_erase_by_non_super_admin_forbidden(
  connection: api.IConnection,
) {
  // Prepare unique emails for each admin
  const callerEmail: string = typia.random<string & tags.Format<"email">>();
  const targetEmail: string = typia.random<string & tags.Format<"email">>();

  // 1) Create non-super admin (caller). The SDK sets connection.headers
  //    Authorization to the returned access token automatically.
  const caller: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: callerEmail,
        password: "P@ssw0rd!",
        is_super: false,
      } satisfies ITodoAppAdmin.ICreate,
    });
  typia.assert(caller);

  TestValidator.predicate(
    "caller token is present",
    !!(caller.token && caller.token.access),
  );

  // 2) Create target admin using a fresh unauthenticated connection so that
  //    the original `connection` remains authenticated as the caller.
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const target: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(unauthConn, {
      body: {
        email: targetEmail,
        password: "P@ssw0rd!",
        is_super: false,
      } satisfies ITodoAppAdmin.ICreate,
    });
  typia.assert(target);

  // 3) As the non-super caller, attempt to erase the target admin. The call
  //    should fail (forbidden). We assert that an error is thrown.
  await TestValidator.error(
    "non-super admin cannot erase another admin",
    async () => {
      await api.functional.todoApp.admin.admins.erase(connection, {
        adminId: target.id,
      });
    },
  );

  // 4) Verify the target still exists by attempting to create another admin
  //    with the same email. If the target remains, duplicate creation should
  //    fail. Use a fresh unauthenticated connection for the duplicate check.
  const unauthConn2: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "duplicate email should fail - target still exists",
    async () => {
      await api.functional.auth.admin.join(unauthConn2, {
        body: {
          email: targetEmail,
          password: "P@ssw0rd!",
        } satisfies ITodoAppAdmin.ICreate,
      });
    },
  );

  // Sanity check: caller id remains present
  TestValidator.predicate("caller id remains non-empty", caller.id !== "");
}
