import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppCollaborationPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCollaborationPermission";

/**
 * Validate admin soft-delete of a collaboration permission by id.
 *
 * Business context:
 *
 * - An administrator can register a new collaboration permission (code,
 *   description, isGrantable) that controls collaboration-related
 *   authorization.
 * - Administrators may later soft-delete (retire) a permission by id. The API
 *   implements soft-delete semantics (sets deleted_at) and the delete operation
 *   is idempotent.
 *
 * Test steps:
 *
 * 1. Admin signs up via POST /auth/admin/join (ITodoAppAdmin.ICreate) and receives
 *    ITodoAppAdmin.IAuthorized with tokens. The SDK populates connection
 *    headers.
 * 2. Using the admin context, create a collaboration permission via POST
 *    /todoApp/admin/collaborationPermissions
 *    (ITodoAppCollaborationPermission.ICreate).
 * 3. Soft-delete the permission using DELETE
 *    /todoApp/admin/collaborationPermissions/{permissionId}.
 * 4. Call DELETE again for the same id to validate idempotency (operation should
 *    not throw).
 *
 * Notes:
 *
 * - No GET-by-id endpoint is available in the provided SDK; therefore we validate
 *   deletion via idempotency and successful creation assertions.
 */
export async function test_api_collaboration_permission_soft_delete_by_id_admin(
  connection: api.IConnection,
) {
  // 1. Admin sign-up (join) to obtain admin credentials and auth token
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd-1234",
    display_name: RandomGenerator.name(),
    role: "superadmin",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppAdmin.ICreate;

  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: adminBody,
    },
  );
  // Validate admin response shape and token presence
  typia.assert(admin);
  TestValidator.predicate(
    "admin join returned token",
    typeof admin.token?.access === "string" && admin.token.access.length > 0,
  );

  // 2. Create a collaboration permission with a unique code
  const code = `test.permission.delete.byId-${RandomGenerator.alphaNumeric(8)}`;
  const permissionBody = {
    code,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    isGrantable: true,
  } satisfies ITodoAppCollaborationPermission.ICreate;

  const permission: ITodoAppCollaborationPermission =
    await api.functional.todoApp.admin.collaborationPermissions.create(
      connection,
      {
        body: permissionBody,
      },
    );
  // Validate response shape
  typia.assert(permission);

  // Business assertions
  TestValidator.equals(
    "created permission code matches",
    permission.code,
    code,
  );
  TestValidator.equals(
    "created permission isGrantable",
    permission.isGrantable,
    true,
  );
  // Ensure returned id looks like a UUID (typia.assert already validates formats)
  TestValidator.predicate(
    "permission id present",
    typeof permission.id === "string" && permission.id.length > 0,
  );

  // 3. Soft-delete the permission by id
  await api.functional.todoApp.admin.collaborationPermissions.eraseByPermissionid(
    connection,
    {
      permissionId: permission.id,
    },
  );

  // 4. Call delete again to validate idempotency (should not throw)
  let secondDeleteSucceeded = false;
  await api.functional.todoApp.admin.collaborationPermissions.eraseByPermissionid(
    connection,
    {
      permissionId: permission.id,
    },
  );
  secondDeleteSucceeded = true;
  TestValidator.predicate(
    "delete is idempotent (second call succeeds)",
    secondDeleteSucceeded === true,
  );
}
