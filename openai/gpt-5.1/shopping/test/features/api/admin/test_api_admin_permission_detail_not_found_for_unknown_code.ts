import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPermission";

export async function test_api_admin_permission_detail_not_found_for_unknown_code(
  connection: api.IConnection,
) {
  // 1. Join as an admin to obtain admin Authorization token in connection headers
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Optionally create a valid permission to verify system works and to ensure at least one known existing code
  const existingPermissionBody = {
    code: `perm.${RandomGenerator.alphaNumeric(16)}`,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    category: "test-category",
    is_system: false,
  } satisfies IShoppingMallAdminPermission.ICreate;

  const existingPermission: IShoppingMallAdminPermission =
    await api.functional.shoppingMall.admin.adminPermissions.create(
      connection,
      {
        body: existingPermissionBody,
      },
    );
  typia.assert(existingPermission);

  // 3. Generate a clearly unique, non-existent permission code
  // Make sure it's very unlikely to collide with the one we just created
  const unknownCode = `unknown.${RandomGenerator.alphaNumeric(32)}`;

  // 4 & 5. Invoke detail endpoint with the unknown code and verify it fails with HttpError
  await TestValidator.error(
    "unknown permission code should result in HttpError",
    async () => {
      // This call must throw; if it returns successfully, the validator will fail
      await api.functional.shoppingMall.admin.adminPermissions.at(connection, {
        adminPermissionCode: unknownCode,
      });
    },
  );
}
