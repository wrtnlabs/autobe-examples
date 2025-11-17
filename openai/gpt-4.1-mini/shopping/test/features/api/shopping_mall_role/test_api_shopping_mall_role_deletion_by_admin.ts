import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";

export async function test_api_shopping_mall_role_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins and authenticates
  const adminJoinBody: IShoppingMallAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "securePassword123!",
    ip: null,
    href: "https://localhost/admin",
    referrer: "https://localhost/login",
  };
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Create a shopping mall role
  const roleCreateBody: IShoppingMallRole.ICreate = {
    name: `test-role-${RandomGenerator.alphaNumeric(6)}`,
    label: `Test Role ${RandomGenerator.alphaNumeric(4)}`,
    description: "Temporary role for E2E test deletion scenario.",
  };
  const createdRole: IShoppingMallRole =
    await api.functional.shoppingMall.admin.shoppingMallRoles.create(
      connection,
      { body: roleCreateBody },
    );
  typia.assert(createdRole);
  TestValidator.equals(
    "created role name equals input",
    createdRole.name,
    roleCreateBody.name,
  );

  // 3. Delete the created role
  await api.functional.shoppingMall.admin.shoppingMallRoles.erase(connection, {
    name: createdRole.name,
  });

  // 4. Confirm deletion by attempting deleting again leads to error
  await TestValidator.error(
    "deleting nonexistent role should fail",
    async () => {
      await api.functional.shoppingMall.admin.shoppingMallRoles.erase(
        connection,
        { name: createdRole.name },
      );
    },
  );
}
