import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemAdmin";

/**
 * Validate self-retrieval of a System Admin by ID with authorization.
 *
 * Steps:
 *
 * 1. Register a system admin via join (returns identity and tokens, SDK sets auth
 *    header automatically)
 * 2. Retrieve the same admin by ID and validate identity and timestamps
 * 3. Verify unauthorized access fails when no token is provided
 * 4. Verify non-existent UUID retrieval fails
 */
export async function test_api_system_admin_self_retrieval_by_id(
  connection: api.IConnection,
) {
  // 1) Create and authenticate a system admin
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ITodoListSystemAdmin.ICreate;

  const authorized = await api.functional.auth.systemAdmin.join(connection, {
    body: createBody,
  });
  typia.assert(authorized); // ITodoListSystemAdmin.IAuthorized
  typia.assert<IAuthorizationToken>(authorized.token);

  // 2) Retrieve admin by id using the authenticated connection
  const admin = await api.functional.todoList.systemAdmin.systemAdmins.at(
    connection,
    { systemAdminId: authorized.id },
  );
  typia.assert(admin); // ITodoListSystemAdmin

  // Identity matches
  TestValidator.equals(
    "self retrieval: id must match authorized id",
    admin.id,
    authorized.id,
  );
  TestValidator.equals(
    "self retrieval: email must match authorized email",
    admin.email,
    authorized.email,
  );

  // Timestamps monotonicity: updated_at >= created_at
  const createdAtMs = new Date(admin.created_at).getTime();
  const updatedAtMs = new Date(admin.updated_at).getTime();
  TestValidator.predicate(
    "timestamps: updated_at must be >= created_at",
    updatedAtMs >= createdAtMs,
  );

  // 3) Unauthorized access must fail without token
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized access without token must fail",
    async () => {
      await api.functional.todoList.systemAdmin.systemAdmins.at(unauthConn, {
        systemAdminId: authorized.id,
      });
    },
  );

  // 4) Non-existent UUID retrieval must fail
  let notFoundId = typia.random<string & tags.Format<"uuid">>();
  if (notFoundId === authorized.id) {
    notFoundId = typia.random<string & tags.Format<"uuid">>();
  }
  await TestValidator.error(
    "non-existent system admin id must not be retrievable",
    async () => {
      await api.functional.todoList.systemAdmin.systemAdmins.at(connection, {
        systemAdminId: notFoundId,
      });
    },
  );
}
