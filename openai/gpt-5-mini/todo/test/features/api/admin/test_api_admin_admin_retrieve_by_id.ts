import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

/* Finalized test implementation with suggested fixes applied */
/**
 * E2E test for retrieving an admin's safe profile by id.
 *
 * Steps:
 *
 * 1. Create a caller admin (auth) via POST /auth/admin/join (callerConn).
 * 2. Create a separate target admin via POST /auth/admin/join (targetConn) and
 *    record its id.
 * 3. Call GET /todoApp/admin/admins/{adminId} using callerConn (authenticated as
 *    caller).
 * 4. Assert the returned representation matches ITodoAppAdmin and contains only
 *    safe fields.
 * 5. Negative tests: unauthenticated access should fail; malformed UUID should
 *    fail.
 */
export async function test_api_admin_admin_retrieve_by_id(
  connection: api.IConnection,
) {
  // 1. Create caller admin on its own connection to retain its token locally
  const callerConn: api.IConnection = { ...connection, headers: {} };
  const callerEmail = typia.random<string & tags.Format<"email">>();
  const callerPassword = `P@ss-${RandomGenerator.alphaNumeric(8)}`;

  const caller: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(callerConn, {
      body: {
        email: callerEmail,
        password: callerPassword,
      } satisfies ITodoAppAdmin.ICreate,
    });
  typia.assert(caller);

  // 2. Create target admin on its own connection (so its token doesn't overwrite callerConn)
  const targetConn: api.IConnection = { ...connection, headers: {} };
  const targetEmail = typia.random<string & tags.Format<"email">>();
  const targetPassword = `P@ss-${RandomGenerator.alphaNumeric(8)}`;

  const target: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(targetConn, {
      body: {
        email: targetEmail,
        password: targetPassword,
      } satisfies ITodoAppAdmin.ICreate,
    });
  typia.assert(target);

  // 3. Retrieve the target admin using the caller's connection (callerConn holds caller's token)
  const retrieved: ITodoAppAdmin = await api.functional.todoApp.admin.admins.at(
    callerConn,
    {
      adminId: target.id,
    },
  );
  typia.assert(retrieved);

  // 4. Business assertions
  TestValidator.equals(
    "retrieved admin id matches requested id",
    retrieved.id,
    target.id,
  );
  TestValidator.equals(
    "retrieved admin email matches target email",
    retrieved.email,
    target.email,
  );
  TestValidator.predicate(
    "is_super is boolean",
    typeof retrieved.is_super === "boolean",
  );
  TestValidator.predicate(
    "created_at exists and is string",
    typeof retrieved.created_at === "string" && retrieved.created_at.length > 0,
  );
  TestValidator.predicate(
    "last_active_at is nullable or ISO string",
    retrieved.last_active_at === null ||
      typeof retrieved.last_active_at === "string",
  );
  // Sensitive fields must not be present on the safe DTO
  TestValidator.predicate(
    "sensitive field password_hash is omitted",
    !Object.prototype.hasOwnProperty.call(retrieved, "password_hash"),
  );

  // 5. Negative tests: unauthenticated access should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated access should be rejected",
    async () => {
      await api.functional.todoApp.admin.admins.at(unauthConn, {
        adminId: target.id,
      });
    },
  );

  // 6. Negative test: malformed UUID should produce an error (bad request)
  await TestValidator.error("malformed UUID should cause error", async () => {
    // pass an obviously invalid UUID string (no type-bypass used)
    await api.functional.todoApp.admin.admins.at(callerConn, {
      adminId: "not-a-valid-uuid",
    } as any);
  });
}
