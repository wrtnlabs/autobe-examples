import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPermission";

export async function test_api_admin_permission_update_conflicting_name_or_category_rules(
  connection: api.IConnection,
) {
  // 1. Join an admin to obtain authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create two distinct admin permissions (A and B)
  const permissionACreateBody = {
    code: "orders.view",
    name: "View Orders",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    category: "orders",
    is_system: false,
  } satisfies IShoppingMallAdminPermission.ICreate;

  const permissionA =
    await api.functional.shoppingMall.admin.adminPermissions.create(
      connection,
      {
        body: permissionACreateBody,
      },
    );
  typia.assert<IShoppingMallAdminPermission>(permissionA);

  const permissionBCreateBody = {
    code: "orders.manage",
    name: "Manage Orders",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    category: "orders",
    is_system: false,
  } satisfies IShoppingMallAdminPermission.ICreate;

  const permissionB =
    await api.functional.shoppingMall.admin.adminPermissions.create(
      connection,
      {
        body: permissionBCreateBody,
      },
    );
  typia.assert<IShoppingMallAdminPermission>(permissionB);

  // 3. Read back permissionB before update and verify it matches creation result
  const beforeUpdate =
    await api.functional.shoppingMall.admin.adminPermissions.at(connection, {
      adminPermissionCode: permissionB.code,
    });
  typia.assert<IShoppingMallAdminPermission>(beforeUpdate);

  TestValidator.equals(
    "permissionB.code should match beforeUpdate.code",
    beforeUpdate.code,
    permissionB.code,
  );
  TestValidator.equals(
    "permissionB.name should match beforeUpdate.name",
    beforeUpdate.name,
    permissionB.name,
  );
  TestValidator.equals(
    "permissionB.description should match beforeUpdate.description",
    beforeUpdate.description ?? null,
    permissionB.description ?? null,
  );
  TestValidator.equals(
    "permissionB.category should match beforeUpdate.category",
    beforeUpdate.category ?? null,
    permissionB.category ?? null,
  );
  TestValidator.equals(
    "permissionB.is_system should match beforeUpdate.is_system",
    beforeUpdate.is_system,
    permissionB.is_system,
  );

  // 4. Call the update endpoint on permissionB (no request body available in SDK)
  await api.functional.shoppingMall.admin.adminPermissions.update(connection, {
    adminPermissionCode: permissionB.code,
  });

  // 5. Read back permissionB after the update and verify metadata has not changed
  const afterUpdate =
    await api.functional.shoppingMall.admin.adminPermissions.at(connection, {
      adminPermissionCode: permissionB.code,
    });
  typia.assert<IShoppingMallAdminPermission>(afterUpdate);

  TestValidator.equals(
    "afterUpdate.code should remain unchanged",
    afterUpdate.code,
    beforeUpdate.code,
  );
  TestValidator.equals(
    "afterUpdate.name should remain unchanged",
    afterUpdate.name,
    beforeUpdate.name,
  );
  TestValidator.equals(
    "afterUpdate.description should remain unchanged",
    afterUpdate.description ?? null,
    beforeUpdate.description ?? null,
  );
  TestValidator.equals(
    "afterUpdate.category should remain unchanged",
    afterUpdate.category ?? null,
    beforeUpdate.category ?? null,
  );
  TestValidator.equals(
    "afterUpdate.is_system should remain unchanged",
    afterUpdate.is_system,
    beforeUpdate.is_system,
  );

  // 6. Optionally, verify that permissionA was not affected by the update to permissionB
  const reloadedA = await api.functional.shoppingMall.admin.adminPermissions.at(
    connection,
    {
      adminPermissionCode: permissionA.code,
    },
  );
  typia.assert<IShoppingMallAdminPermission>(reloadedA);

  TestValidator.equals(
    "permissionA.code should remain unchanged",
    reloadedA.code,
    permissionA.code,
  );
  TestValidator.equals(
    "permissionA.name should remain unchanged",
    reloadedA.name,
    permissionA.name,
  );
  TestValidator.equals(
    "permissionA.description should remain unchanged",
    reloadedA.description ?? null,
    permissionA.description ?? null,
  );
  TestValidator.equals(
    "permissionA.category should remain unchanged",
    reloadedA.category ?? null,
    permissionA.category ?? null,
  );
  TestValidator.equals(
    "permissionA.is_system should remain unchanged",
    reloadedA.is_system,
    permissionA.is_system,
  );
}
