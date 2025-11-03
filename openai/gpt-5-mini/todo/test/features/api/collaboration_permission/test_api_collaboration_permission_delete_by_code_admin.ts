import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppCollaborationPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCollaborationPermission";

export async function test_api_collaboration_permission_delete_by_code_admin(
  connection: api.IConnection,
) {
  /**
   * E2E: Admin deletes a collaboration permission by its code.
   *
   * Business flow (implemented with available SDK functions):
   *
   * 1. Register an admin (POST /auth/admin/join). The SDK will populate
   *    connection.headers.Authorization with the returned token.
   * 2. Create a collaboration permission with a unique code (POST
   *    /todoApp/admin/collaborationPermissions).
   * 3. Validate uniqueness by attempting duplicate creation (expect error).
   * 4. Delete the permission by its code (DELETE .../:permissionCode).
   * 5. Re-create the same permission code to verify deletion cleared the
   *    uniqueness constraint (hard-delete semantics).
   *
   * Notes:
   *
   * - The SDK does not expose GET/list endpoints for permissions, so we validate
   *   deletion using create/unique behavior instead.
   * - All request bodies use `satisfies` with the correct DTO types.
   */

  // --- 1) Admin registration ---
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminBody = {
    email: adminEmail,
    password: "Password123!", // meets MinLength<8>
    display_name: RandomGenerator.name(),
    role: "superadmin",
    ip: null,
    href: `http://example.com/${RandomGenerator.alphaNumeric(6)}`,
    referrer: `http://example.com/ref/${RandomGenerator.alphaNumeric(6)}`,
  } satisfies ITodoAppAdmin.ICreate;

  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    { body: adminBody },
  );
  typia.assert(admin);

  // --- 2) Create collaboration permission with unique code ---
  const uniqueSuffix = RandomGenerator.alphaNumeric(6);
  const permissionCode = `test.permission.delete.byCode-${uniqueSuffix}`;
  const permissionBody = {
    code: permissionCode,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    isGrantable: true,
  } satisfies ITodoAppCollaborationPermission.ICreate;

  const created: ITodoAppCollaborationPermission =
    await api.functional.todoApp.admin.collaborationPermissions.create(
      connection,
      {
        body: permissionBody,
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "created permission code matches input",
    created.code,
    permissionCode,
  );

  // --- 3) Attempt duplicate creation (business uniqueness validation) ---
  await TestValidator.error(
    "creating duplicate permission code should fail",
    async () => {
      await api.functional.todoApp.admin.collaborationPermissions.create(
        connection,
        {
          body: permissionBody,
        },
      );
    },
  );

  // --- 4) Delete the permission by code ---
  await api.functional.todoApp.admin.collaborationPermissions.eraseByPermissioncode(
    connection,
    {
      permissionCode: permissionCode,
    },
  );

  // --- 5) Re-create the same permission after deletion (should succeed)
  const recreated: ITodoAppCollaborationPermission =
    await api.functional.todoApp.admin.collaborationPermissions.create(
      connection,
      {
        body: permissionBody,
      },
    );
  typia.assert(recreated);
  TestValidator.equals(
    "recreated permission code matches original",
    recreated.code,
    permissionCode,
  );
}
