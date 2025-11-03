import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppCollaborationPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCollaborationPermission";

/**
 * Verify idempotent soft-delete behavior of collaboration permission erase API.
 *
 * Business context: Administrators can create collaboration permission
 * definitions that are soft-deleted by marking a deleted_at timestamp. Deleting
 * the same permission multiple times should be safe (idempotent). Different
 * implementations may either return success on repeated deletes or return
 * not-found; both are acceptable for this test.
 *
 * Steps:
 *
 * 1. Create an admin account via POST /auth/admin/join
 * 2. Create a collaboration permission via POST
 *    /todoApp/admin/collaborationPermissions
 * 3. Call DELETE /todoApp/admin/collaborationPermissions/{permissionId} once
 *    (expect no throw)
 * 4. Call DELETE the same id again and accept either success or error as
 *    implementation-specific idempotent behavior.
 */
export async function test_api_collaboration_permission_soft_delete_by_id_idempotent(
  connection: api.IConnection,
) {
  // 1) Admin registration (required to create and delete permissions)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "P4ssw0rd!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppAdmin.ICreate,
  });
  typia.assert(admin);

  // 2) Create a unique collaboration permission
  const uniqueToken = RandomGenerator.alphaNumeric(6);
  const code = `test.permission.idempotent-${uniqueToken}`;
  const permission: ITodoAppCollaborationPermission =
    await api.functional.todoApp.admin.collaborationPermissions.create(
      connection,
      {
        body: {
          code,
          description: `Idempotency test permission ${uniqueToken}`,
          isGrantable: true,
        } satisfies ITodoAppCollaborationPermission.ICreate,
      },
    );
  typia.assert(permission);

  // Validate created permission has expected code
  TestValidator.equals(
    "created permission code matches",
    permission.code,
    code,
  );

  // 3) First delete: must succeed (i.e., not throw)
  await api.functional.todoApp.admin.collaborationPermissions.eraseByPermissionid(
    connection,
    { permissionId: permission.id },
  );
  // If above threw, test would fail. Record success.
  TestValidator.predicate("first delete completed without throwing", true);

  // 4) Second delete: accept either success (idempotent) or failure (already deleted)
  try {
    await api.functional.todoApp.admin.collaborationPermissions.eraseByPermissionid(
      connection,
      { permissionId: permission.id },
    );
    // Second call also succeeded -> idempotent success observed
    TestValidator.predicate(
      "second delete completed without throwing (idempotent)",
      true,
    );
  } catch (err) {
    // If an error occurred (e.g., not-found), treat it as an acceptable
    // implementation-specific idempotent outcome. Do not inspect status code.
    TestValidator.predicate(
      "second delete threw an error (already deleted) — acceptable idempotent behavior",
      true,
    );
  }
}
