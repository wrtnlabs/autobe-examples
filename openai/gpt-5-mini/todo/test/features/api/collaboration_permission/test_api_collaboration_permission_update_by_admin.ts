import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppCollaborationPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCollaborationPermission";

export async function test_api_collaboration_permission_update_by_admin(
  connection: api.IConnection,
) {
  /**
   * E2E test for admin updating collaboration permissions.
   *
   * Workflow:
   *
   * 1. Create an admin via POST /auth/admin/join (join creates auth token on
   *    connection)
   * 2. Create two collaboration permissions (Permission A and Permission B)
   * 3. Update Permission A with new code/description/isGrantable and assert
   *    success
   * 4. Attempt uniqueness-conflict update (set A.code to B.code) and expect 409
   * 5. Validate malformed-UUID (400), not-found (404), and unauthorized (401/403)
   */

  // 1) Register a new admin (join). join() will set connection.headers.Authorization
  const adminPayload = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPassw0rd",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppAdmin.ICreate;

  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    { body: adminPayload },
  );
  typia.assert(admin);

  // Helper to create permission
  const createPermission = async (
    body: ITodoAppCollaborationPermission.ICreate,
  ): Promise<ITodoAppCollaborationPermission> => {
    const res =
      await api.functional.todoApp.admin.collaborationPermissions.create(
        connection,
        { body },
      );
    typia.assert(res);
    return res;
  };

  // 2) Create Permission A and Permission B
  const permissionABody = {
    code: "list.read",
    description: "Read lists",
    isGrantable: true,
  } satisfies ITodoAppCollaborationPermission.ICreate;

  const permissionBBody = {
    code: "list.write",
    description: "Write lists",
    isGrantable: true,
  } satisfies ITodoAppCollaborationPermission.ICreate;

  const permissionA: ITodoAppCollaborationPermission =
    await createPermission(permissionABody);
  const permissionB: ITodoAppCollaborationPermission =
    await createPermission(permissionBBody);

  // Basic sanity checks
  typia.assert(permissionA);
  typia.assert(permissionB);
  TestValidator.equals(
    "permission A code matches",
    permissionA.code,
    "list.read",
  );
  TestValidator.equals(
    "permission B code matches",
    permissionB.code,
    "list.write",
  );

  // 3) Successful update of Permission A
  const prevUpdatedAt = permissionA.updatedAt;

  const updateBody = {
    code: "list.read.v2",
    description: "Read-only lists (v2)",
    isGrantable: false,
  } satisfies ITodoAppCollaborationPermission.IUpdate;

  const updated: ITodoAppCollaborationPermission =
    await api.functional.todoApp.admin.collaborationPermissions.update(
      connection,
      {
        permissionId: permissionA.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // Validate fields changed as expected
  TestValidator.equals("id unchanged after update", updated.id, permissionA.id);
  TestValidator.equals("code updated", updated.code, updateBody.code);
  TestValidator.equals(
    "description updated",
    updated.description,
    updateBody.description,
  );
  TestValidator.equals(
    "isGrantable updated",
    updated.isGrantable,
    updateBody.isGrantable,
  );
  TestValidator.predicate(
    "updatedAt should be newer",
    new Date(updated.updatedAt).getTime() > new Date(prevUpdatedAt).getTime(),
  );

  // 4) Uniqueness conflict: attempt to set Permission A's code to Permission B's code
  await TestValidator.httpError(
    "updating to duplicate code should return conflict",
    409,
    async () => {
      await api.functional.todoApp.admin.collaborationPermissions.update(
        connection,
        {
          permissionId: permissionA.id,
          body: {
            code: permissionB.code,
          } satisfies ITodoAppCollaborationPermission.IUpdate,
        },
      );
    },
  );

  // 5) Error and edge cases
  // 5.1 Invalid UUID format -> 400
  await TestValidator.httpError(
    "malformed permissionId should return 400",
    400,
    async () => {
      await api.functional.todoApp.admin.collaborationPermissions.update(
        connection,
        {
          permissionId: "invalid-uuid",
          body: {
            description: "noop",
          } satisfies ITodoAppCollaborationPermission.IUpdate,
        },
      );
    },
  );

  // 5.2 Not found: valid UUID that does not exist -> 404
  const randomNonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "updating non-existent permission should return 404",
    404,
    async () => {
      await api.functional.todoApp.admin.collaborationPermissions.update(
        connection,
        {
          permissionId: randomNonExistentId,
          body: {
            description: "not found update",
          } satisfies ITodoAppCollaborationPermission.IUpdate,
        },
      );
    },
  );

  // 5.3 Authorization: attempt PUT without admin token -> 401 or 403
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.httpError(
    "unauthenticated update should return 401/403",
    [401, 403],
    async () => {
      await api.functional.todoApp.admin.collaborationPermissions.update(
        unauthConn,
        {
          permissionId: permissionA.id,
          body: {
            description: "attempt without auth",
          } satisfies ITodoAppCollaborationPermission.IUpdate,
        },
      );
    },
  );
}
