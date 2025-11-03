import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";

export async function test_api_collaboration_permission_delete_by_code_not_found(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * - Ensure that attempting to delete a collaboration permission by a code that
   *   does not exist results in a runtime error from the API.
   *
   * Strategy:
   *
   * 1. Create an admin account via POST /auth/admin/join to obtain authorization
   *    (SDK will set connection.headers.Authorization automatically).
   * 2. Attempt to delete a non-existent permission code and verify that the
   *    operation throws (TestValidator.error with async callback).
   */

  // 1) Register a fresh admin account
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPassw0rd!",
    display_name: RandomGenerator.name(),
    role: "superadmin",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies ITodoAppAdmin.ICreate;

  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: adminBody,
    },
  );
  // Validate response shape and that token was returned
  typia.assert(admin);

  // 2) Attempt to delete a non-existent permission code
  const nonExistentPermissionCode = "non.existent.permission.code.test";

  await TestValidator.error(
    "deleting non-existent permission should throw",
    async () => {
      await api.functional.todoApp.admin.collaborationPermissions.eraseByPermissioncode(
        connection,
        {
          permissionCode: nonExistentPermissionCode,
        },
      );
    },
  );
}
