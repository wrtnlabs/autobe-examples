import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserRole";

export async function test_api_admin_erase_with_user_role_assigned(
  connection: api.IConnection,
) {
  // 1. Admin user sign up and join
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "secureP@ssw0rd",
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Assign user role to admin
  const userRoleCreateBody = {
    user_id: adminAuthorized.id,
    role_name: "admin",
  } satisfies IShoppingMallUserRole.ICreate;

  const userRole: IShoppingMallUserRole =
    await api.functional.shoppingMall.admin.userRoles.create(connection, {
      body: userRoleCreateBody,
    });
  typia.assert(userRole);

  // 3. Delete the admin account using its id
  await api.functional.shoppingMall.admin.admins.erase(connection, {
    id: adminAuthorized.id,
  });

  // 4. Validation - ensure deleted admin cannot authenticate again
  await TestValidator.error(
    "authenticate deleted admin should fail",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: adminJoinBody,
      });
    },
  );

  // 5. Validation - deleting with invalid id should fail
  await TestValidator.error(
    "deleting with invalid id should fail",
    async () => {
      await api.functional.shoppingMall.admin.admins.erase(connection, {
        id: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 6. Validation - deleting admin without user role should fail
  // Create another admin without role assignment
  const anotherAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const anotherAdminJoinBody = {
    email: anotherAdminEmail,
    password: "anotherSafePass1",
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;

  const anotherAdminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: anotherAdminJoinBody,
    });
  typia.assert(anotherAdminAuthorized);

  // Attempt deletion without assigning user role (simulate lacking permission)
  await TestValidator.error(
    "deletion without role assignment should fail",
    async () => {
      await api.functional.shoppingMall.admin.admins.erase(connection, {
        id: anotherAdminAuthorized.id,
      });
    },
  );
}
