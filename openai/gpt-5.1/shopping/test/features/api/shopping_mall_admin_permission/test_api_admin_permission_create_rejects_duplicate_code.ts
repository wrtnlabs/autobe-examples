import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPermission";

export async function test_api_admin_permission_create_rejects_duplicate_code(
  connection: api.IConnection,
) {
  // 1. Join an admin to obtain authenticated context
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(12),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create the initial admin permission with a deterministic code
  const permissionCode = `orders.manage.refund.${RandomGenerator.alphabets(6)}`;

  const firstCreateBody = {
    code: permissionCode,
    name: "Manage order refunds",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    category: "orders",
    is_system: false,
  } satisfies IShoppingMallAdminPermission.ICreate;

  const createdPermission: IShoppingMallAdminPermission =
    await api.functional.shoppingMall.admin.adminPermissions.create(
      connection,
      {
        body: firstCreateBody,
      },
    );
  typia.assert(createdPermission);

  // Sanity checks on the created permission
  TestValidator.equals(
    "created permission code should equal request code",
    createdPermission.code,
    firstCreateBody.code,
  );
  TestValidator.equals(
    "created permission name should equal request name",
    createdPermission.name,
    firstCreateBody.name,
  );
  TestValidator.equals(
    "created permission description should equal request description",
    createdPermission.description,
    firstCreateBody.description,
  );
  TestValidator.equals(
    "created permission category should equal request category",
    createdPermission.category,
    firstCreateBody.category,
  );

  // 3. Attempt to create a duplicate permission with the same code but
  //    different metadata, expecting a business error
  const conflictingCreateBody = {
    code: permissionCode, // duplicate
    name: "Conflicting refund permission name",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    category: "risk",
    is_system: true,
  } satisfies IShoppingMallAdminPermission.ICreate;

  await TestValidator.error(
    "duplicate admin permission code must be rejected",
    async () => {
      await api.functional.shoppingMall.admin.adminPermissions.create(
        connection,
        {
          body: conflictingCreateBody,
        },
      );
    },
  );

  // 4. Fetch the permission by its code and ensure it matches the original
  const fetchedPermission: IShoppingMallAdminPermission =
    await api.functional.shoppingMall.admin.adminPermissions.at(connection, {
      adminPermissionCode: permissionCode,
    });
  typia.assert(fetchedPermission);

  // 5. Ensure the fetched permission matches the first creation and not the
  //    conflicting payload
  TestValidator.equals(
    "fetched permission id should equal created permission id",
    fetchedPermission.id,
    createdPermission.id,
  );
  TestValidator.equals(
    "fetched permission code should remain unchanged",
    fetchedPermission.code,
    createdPermission.code,
  );
  TestValidator.equals(
    "fetched permission name should equal originally created name",
    fetchedPermission.name,
    createdPermission.name,
  );
  TestValidator.equals(
    "fetched permission description should equal originally created description",
    fetchedPermission.description,
    createdPermission.description,
  );
  TestValidator.equals(
    "fetched permission category should equal originally created category",
    fetchedPermission.category,
    createdPermission.category,
  );
  TestValidator.equals(
    "fetched permission is_system should equal originally created is_system flag",
    fetchedPermission.is_system,
    createdPermission.is_system,
  );
}
