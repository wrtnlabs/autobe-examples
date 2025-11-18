import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPermission";

export async function test_api_admin_permission_delete_idempotency_on_nonexistent_code(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain an authenticated admin context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Choose a highly unlikely, non-existent permission code
  const nonExistentCodePrefix = "TEST_NON_EXISTENT_PERMISSION_CODE_";
  const nonExistentCodeSuffix = RandomGenerator.alphaNumeric(16);
  const nonExistentCode = `${nonExistentCodePrefix}${nonExistentCodeSuffix}`;

  // 3. Optional pre-check: try to GET the permission; ignore result, only care if it obviously exists
  //    If by any chance it exists (which is extremely unlikely), just skip and pick another code in a real-world test.
  //    Here, we simply allow whatever happens and do not assert on this call.
  await TestValidator.error(
    "pre-check GET for non-existent admin permission should error (or at least is not required to succeed)",
    async () => {
      await api.functional.shoppingMall.admin.adminPermissions.at(connection, {
        adminPermissionCode: nonExistentCode,
      });
    },
  );

  // 4. Main behavior: DELETE must fail when the permission code does not exist
  await TestValidator.error(
    "DELETE on non-existent admin permission code must fail and not be treated as success",
    async () => {
      await api.functional.shoppingMall.admin.adminPermissions.erase(
        connection,
        {
          adminPermissionCode: nonExistentCode,
        },
      );
    },
  );

  // 5. Postcondition: GET still fails, confirming that DELETE did not create anything
  await TestValidator.error(
    "GET after failed DELETE on non-existent admin permission code must still fail",
    async () => {
      await api.functional.shoppingMall.admin.adminPermissions.at(connection, {
        adminPermissionCode: nonExistentCode,
      });
    },
  );
}
