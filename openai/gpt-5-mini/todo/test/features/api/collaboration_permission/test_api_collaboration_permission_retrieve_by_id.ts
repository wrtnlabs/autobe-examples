import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppCollaborationPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCollaborationPermission";

/**
 * Validate retrieval of a collaboration permission by id as an admin and cover
 * common error cases (malformed UUID, not found, unauthorized access).
 *
 * Steps:
 *
 * 1. Register an admin via POST /auth/admin/join (superadmin role) to obtain an
 *    admin access token (SDK sets connection.headers.Authorization).
 * 2. Create a collaboration permission via POST
 *    /todoApp/admin/collaborationPermissions and capture returned id.
 * 3. Retrieve it via GET /todoApp/admin/collaborationPermissions/{permissionId}
 *    and validate the response shape and field values.
 * 4. Validate error cases: malformed UUID (400), not found (404), unauthenticated
 *    access (401/403), and access with a less-privileged admin (expect
 *    401/403).
 */
export async function test_api_collaboration_permission_retrieve_by_id(
  connection: api.IConnection,
) {
  // 1. Register a superadmin to obtain an admin token
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: "Passw0rd!",
        display_name: RandomGenerator.name(),
        role: "superadmin",
        ip: null,
        href: "https://example.com",
        referrer: "https://ref.example.com",
      } satisfies ITodoAppAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // 2. Create a collaboration permission as admin
  const createBody = {
    code: "list.read",
    description: "Read access to lists",
    isGrantable: true,
  } satisfies ITodoAppCollaborationPermission.ICreate;

  const created: ITodoAppCollaborationPermission =
    await api.functional.todoApp.admin.collaborationPermissions.create(
      connection,
      { body: createBody },
    );
  // typia.assert validates full response shape (including id, timestamps, etc.)
  typia.assert(created);

  // Basic business assertions
  TestValidator.equals(
    "created permission code matches",
    created.code,
    createBody.code,
  );
  TestValidator.equals(
    "created permission isGrantable matches",
    created.isGrantable,
    createBody.isGrantable,
  );

  // 3. Happy-path: retrieve by id
  const retrieved: ITodoAppCollaborationPermission =
    await api.functional.todoApp.admin.collaborationPermissions.at(connection, {
      permissionId: created.id,
    });
  typia.assert(retrieved);

  // Response must match the created values
  TestValidator.equals(
    "retrieved id matches created id",
    retrieved.id,
    created.id,
  );
  TestValidator.equals("retrieved code matches", retrieved.code, created.code);
  TestValidator.equals(
    "retrieved description matches",
    retrieved.description,
    created.description,
  );
  TestValidator.equals(
    "retrieved isGrantable matches",
    retrieved.isGrantable,
    created.isGrantable,
  );

  // 4. Error case: malformed UUID -> expect validation error (400)
  await TestValidator.error(
    "malformed permissionId returns error",
    async () => {
      await api.functional.todoApp.admin.collaborationPermissions.at(
        connection,
        {
          permissionId: "invalid-uuid",
        },
      );
    },
  );

  // 5. Error case: well-formed but non-existent UUID -> expect Not Found (404)
  const randomId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent permission id returns not found",
    async () => {
      await api.functional.todoApp.admin.collaborationPermissions.at(
        connection,
        {
          permissionId: randomId,
        },
      );
    },
  );

  // 6. Error case: unauthenticated access
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated request should fail", async () => {
    await api.functional.todoApp.admin.collaborationPermissions.at(unauthConn, {
      permissionId: created.id,
    });
  });

  // 7. Error case: less-privileged admin (create a support-role admin on a fresh connection)
  const supportConn: api.IConnection = { ...connection, headers: {} };
  const supportEmail = typia.random<string & tags.Format<"email">>();
  const supportAdmin: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(supportConn, {
      body: {
        email: supportEmail,
        password: "Passw0rd!",
        display_name: RandomGenerator.name(),
        role: "support",
        ip: null,
        href: "https://example.com",
        referrer: "https://ref.example.com",
      } satisfies ITodoAppAdmin.ICreate,
    });
  typia.assert(supportAdmin);

  await TestValidator.error(
    "less-privileged admin cannot access this endpoint",
    async () => {
      await api.functional.todoApp.admin.collaborationPermissions.at(
        supportConn,
        {
          permissionId: created.id,
        },
      );
    },
  );
}
