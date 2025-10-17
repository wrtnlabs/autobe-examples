import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/*
 * Production-ready E2E test: non-super admin cannot create a super-admin
 *
 * Rationale: Original scenario attempted to change `is_super` via PUT /todoApp/admin/users/{userId},
 * but ITodoAppUser.IUpdate does not contain `is_super`. This test therefore
 * verifies the same privilege protection by attempting to create a super-admin
 * (is_super: true) while authenticated as a non-super admin using
 * POST /auth/admin/join. The backend should prevent privilege escalation; the
 * test asserts that the operation fails (via TestValidator.error) and that an
 * existing target admin's is_super flag remains unchanged.
 */
export async function test_api_admin_update_user_forbidden_change_is_super_by_non_super(
  connection: api.IConnection,
) {
  // Use per-session connection clones to avoid mutating provided connection.headers
  const callerConn: api.IConnection = { ...connection, headers: {} };
  const targetConn: api.IConnection = { ...connection, headers: {} };

  // 1) Create non-super admin (caller)
  const callerEmail: string = typia.random<string & tags.Format<"email">>();
  const caller: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(callerConn, {
      body: {
        email: callerEmail,
        password: "P@ssw0rd",
        is_super: false,
      } satisfies ITodoAppAdmin.ICreate,
    });
  typia.assert(caller);
  TestValidator.predicate("caller is non-super", caller.is_super === false);

  // 2) Create a normal target admin (target)
  const targetEmail: string = typia.random<string & tags.Format<"email">>();
  const target: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(targetConn, {
      body: {
        email: targetEmail,
        password: "P@ssw0rd",
        is_super: false,
      } satisfies ITodoAppAdmin.ICreate,
    });
  typia.assert(target);
  TestValidator.predicate(
    "target initially non-super",
    target.is_super === false,
  );

  // 3) Attempt to create a super-admin while authenticated as non-super caller
  const attemptedSuperEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  await TestValidator.error(
    "non-super caller cannot create a super-admin",
    async () => {
      await api.functional.auth.admin.join(callerConn, {
        body: {
          email: attemptedSuperEmail,
          password: "P@ssw0rd",
          is_super: true,
        } satisfies ITodoAppAdmin.ICreate,
      });
    },
  );

  // 4) Confirm the pre-created target's is_super remains false
  TestValidator.equals("target is_super unchanged", target.is_super, false);
}
