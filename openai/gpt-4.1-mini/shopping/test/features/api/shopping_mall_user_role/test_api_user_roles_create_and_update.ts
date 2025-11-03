import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserRole";

export async function test_api_user_roles_create_and_update(
  connection: api.IConnection,
) {
  // 1. Admin user registration and login
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "P@ssw0rd123",
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a new user role
  // Here, we must create a new user ID fake for the test
  // Since there is no user creation API, we simulate a UUID
  const userId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const roleName: string = "seller";

  const newUserRole: IShoppingMallUserRole =
    await api.functional.shoppingMall.admin.userRoles.create(connection, {
      body: {
        user_id: userId,
        role_name: roleName,
      } satisfies IShoppingMallUserRole.ICreate,
    });
  typia.assert(newUserRole);
  TestValidator.equals(
    "user role created: user_id",
    newUserRole.user_id,
    userId,
  );
  TestValidator.equals(
    "user role created: role_name",
    newUserRole.role_name,
    roleName,
  );

  // 3. Update the user role
  // Since there is no update API mentioned, simulate by creating a new role for same user with a different role name
  // for the purpose of this test we emulate update by creating a different user role

  const updatedRoleName: string = "admin";
  const updatedUserRole: IShoppingMallUserRole =
    await api.functional.shoppingMall.admin.userRoles.create(connection, {
      body: {
        user_id: userId,
        role_name: updatedRoleName,
      } satisfies IShoppingMallUserRole.ICreate,
    });
  typia.assert(updatedUserRole);
  TestValidator.equals(
    "user role updated: user_id",
    updatedUserRole.user_id,
    userId,
  );
  TestValidator.equals(
    "user role updated: role_name",
    updatedUserRole.role_name,
    updatedRoleName,
  );

  // 4. Error handling: attempt to create duplicate role for same user and role_name
  await TestValidator.error(
    "duplicate user role assignment should fail",
    async () => {
      await api.functional.shoppingMall.admin.userRoles.create(connection, {
        body: {
          user_id: userId,
          role_name: updatedRoleName,
        } satisfies IShoppingMallUserRole.ICreate,
      });
    },
  );
}
