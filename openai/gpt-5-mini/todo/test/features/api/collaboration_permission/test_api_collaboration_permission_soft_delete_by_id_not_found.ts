import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

export async function test_api_collaboration_permission_soft_delete_by_id_not_found(
  connection: api.IConnection,
) {
  // 1) Register a new admin account to obtain authentication tokens.
  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: typia.random<ITodoAppAdmin.ICreate>() satisfies ITodoAppAdmin.ICreate,
    },
  );
  // Validate shape of returned authorized admin payload
  typia.assert(admin);

  // 2) Generate a syntactically valid, random UUID that should not exist in the DB
  const nonExistentPermissionId = typia.random<string & tags.Format<"uuid">>();

  // 3) Attempt to soft-delete the non-existent permission and expect 404 Not Found
  await TestValidator.httpError(
    "delete non-existent collaboration permission should return 404",
    404,
    async () => {
      await api.functional.todoApp.admin.collaborationPermissions.eraseByPermissionid(
        connection,
        { permissionId: nonExistentPermissionId },
      );
    },
  );
}
