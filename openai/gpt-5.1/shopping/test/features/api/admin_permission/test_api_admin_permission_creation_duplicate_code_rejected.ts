import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPermission";

export async function test_api_admin_permission_creation_duplicate_code_rejected(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an administrator via /auth/admin/join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create an initial admin permission with a specific unique code
  const permissionCode: string = `users.manage.${RandomGenerator.alphaNumeric(8)}`;

  const firstPermissionBody = {
    code: permissionCode,
    name: "Manage users",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    category: "users",
    is_system: false,
  } satisfies IShoppingMallAdminPermission.ICreate;

  const createdPermission: IShoppingMallAdminPermission =
    await api.functional.shoppingMall.admin.adminPermissions.create(
      connection,
      {
        body: firstPermissionBody,
      },
    );
  typia.assert<IShoppingMallAdminPermission>(createdPermission);

  // Verify that the created permission code matches what we requested
  TestValidator.equals(
    "created permission code should match requested code",
    createdPermission.code,
    permissionCode,
  );

  // 3. Attempt to create a second permission with the same code but different name/description
  const duplicatePermissionBody = {
    code: permissionCode,
    name: "Manage users (duplicate)",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    category: "users",
    is_system: false,
  } satisfies IShoppingMallAdminPermission.ICreate;

  await TestValidator.error(
    "creating an admin permission with a duplicate code must fail",
    async () => {
      await api.functional.shoppingMall.admin.adminPermissions.create(
        connection,
        {
          body: duplicatePermissionBody,
        },
      );
    },
  );

  // 4. Fetch the permission by its code to ensure it still exists and was not overwritten
  const fetchedPermission: IShoppingMallAdminPermission =
    await api.functional.shoppingMall.admin.adminPermissions.at(connection, {
      adminPermissionCode: permissionCode,
    });
  typia.assert<IShoppingMallAdminPermission>(fetchedPermission);

  // 5. Validate that the fetched permission matches the originally created one
  TestValidator.equals(
    "fetched permission code remains unchanged after duplicate attempt",
    fetchedPermission.code,
    createdPermission.code,
  );
  TestValidator.equals(
    "fetched permission name remains the original one after duplicate attempt",
    fetchedPermission.name,
    createdPermission.name,
  );
  TestValidator.equals(
    "fetched permission description remains the original one after duplicate attempt",
    fetchedPermission.description,
    createdPermission.description,
  );
  TestValidator.equals(
    "fetched permission category remains the original one after duplicate attempt",
    fetchedPermission.category,
    createdPermission.category,
  );
  TestValidator.equals(
    "fetched permission is_system flag remains the original one after duplicate attempt",
    fetchedPermission.is_system,
    createdPermission.is_system,
  );
}
