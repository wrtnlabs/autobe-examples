import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPermission";

export async function test_api_shopping_mall_admin_permission_get_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins and obtains authorization token
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: `e2e.admin.${RandomGenerator.alphaNumeric(8)}@test.com`,
        password: "Test1234!",
        ip: null,
        href: "https://e2e.example.com/admin/join",
        referrer: "https://e2e.example.com/referrer",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a shopping mall permission entity for the test
  const permissionName = `perm_${RandomGenerator.alphaNumeric(12)}`;
  const label = `Label of ${permissionName}`;
  const description = `Detailed description for permission ${permissionName}`;

  const createdPermission: IShoppingMallPermission =
    await api.functional.shoppingMall.admin.shoppingMallPermissions.create(
      connection,
      {
        body: {
          name: permissionName,
          label: label,
          description: description,
        } satisfies IShoppingMallPermission.ICreate,
      },
    );
  typia.assert(createdPermission);

  // 3. Retrieve the permission by name
  const retrievedPermission: IShoppingMallPermission =
    await api.functional.shoppingMall.admin.shoppingMallPermissions.at(
      connection,
      {
        name: permissionName,
      },
    );
  typia.assert(retrievedPermission);

  // 4. Validate that retrieved permission matches created one
  TestValidator.equals(
    "permission id matches",
    retrievedPermission.id,
    createdPermission.id,
  );
  TestValidator.equals(
    "permission name matches",
    retrievedPermission.name,
    createdPermission.name,
  );
  TestValidator.equals(
    "permission label matches",
    retrievedPermission.label,
    createdPermission.label,
  );
  TestValidator.equals(
    "permission description matches",
    retrievedPermission.description,
    createdPermission.description,
  );
}
