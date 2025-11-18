import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPermission";

export async function test_api_admin_permission_detail_requires_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain an authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a new admin permission using the authenticated admin context
  const permissionCreateBody = {
    code: `e2e.permission.${RandomGenerator.alphaNumeric(12)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    category: "e2e-test",
    is_system: false,
  } satisfies IShoppingMallAdminPermission.ICreate;

  const createdPermission =
    await api.functional.shoppingMall.admin.adminPermissions.create(
      connection,
      {
        body: permissionCreateBody,
      },
    );
  typia.assert<IShoppingMallAdminPermission>(createdPermission);

  // 3. Prepare an unauthenticated connection (no Authorization header)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Ensure unauthenticated access to permission detail fails
  await TestValidator.error(
    "unauthenticated permission detail access should fail",
    async () => {
      await api.functional.shoppingMall.admin.adminPermissions.at(
        unauthenticatedConnection,
        {
          adminPermissionCode: createdPermission.code,
        },
      );
    },
  );

  // 5. Authenticated admin should successfully fetch permission detail
  const fetchedPermission =
    await api.functional.shoppingMall.admin.adminPermissions.at(connection, {
      adminPermissionCode: createdPermission.code,
    });
  typia.assert<IShoppingMallAdminPermission>(fetchedPermission);

  // 6. Validate that fetched permission matches the created one on key fields
  TestValidator.equals(
    "permission id should match between create and detail",
    fetchedPermission.id,
    createdPermission.id,
  );
  TestValidator.equals(
    "permission code should match between create and detail",
    fetchedPermission.code,
    createdPermission.code,
  );
  TestValidator.equals(
    "permission name should match between create and detail",
    fetchedPermission.name,
    createdPermission.name,
  );
  TestValidator.equals(
    "permission description should match between create and detail",
    fetchedPermission.description ?? null,
    createdPermission.description ?? null,
  );
  TestValidator.equals(
    "permission category should match between create and detail",
    fetchedPermission.category ?? null,
    createdPermission.category ?? null,
  );
  TestValidator.equals(
    "permission is_system flag should match between create and detail",
    fetchedPermission.is_system,
    createdPermission.is_system,
  );
}
