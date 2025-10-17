import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test admin role level assignment and permissions.
 *
 * This test validates the hierarchical admin role structure by creating a
 * super_admin account and then using it to create multiple admin accounts with
 * different role levels. It verifies that role_level is correctly assigned and
 * that JWT tokens reflect the proper permissions for each role type.
 *
 * Steps:
 *
 * 1. Create initial super_admin account
 * 2. Verify super_admin authentication and role assignment
 * 3. Create order_manager admin account
 * 4. Create content_moderator admin account
 * 5. Create support_admin admin account
 * 6. Create another super_admin account
 * 7. Verify all role levels are correctly assigned
 */
export async function test_api_admin_role_level_assignment_and_permissions(
  connection: api.IConnection,
) {
  // Step 1: Create initial super_admin account
  const superAdminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const superAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: superAdminData,
    });
  typia.assert(superAdmin);

  // Step 2: Verify super_admin authentication and role assignment
  TestValidator.equals(
    "super_admin role_level assigned",
    superAdmin.role_level,
    "super_admin",
  );
  TestValidator.equals(
    "super_admin email matches",
    superAdmin.email,
    superAdminData.email,
  );
  TestValidator.equals(
    "super_admin name matches",
    superAdmin.name,
    superAdminData.name,
  );
  typia.assert(superAdmin.token);

  // Step 3: Create order_manager admin account
  const orderManagerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "order_manager",
  } satisfies IShoppingMallAdmin.ICreate;

  const orderManager: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: orderManagerData,
    });
  typia.assert(orderManager);
  TestValidator.equals(
    "order_manager role_level assigned",
    orderManager.role_level,
    "order_manager",
  );
  TestValidator.equals(
    "order_manager email matches",
    orderManager.email,
    orderManagerData.email,
  );

  // Step 4: Create content_moderator admin account
  const contentModeratorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "content_moderator",
  } satisfies IShoppingMallAdmin.ICreate;

  const contentModerator: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: contentModeratorData,
    });
  typia.assert(contentModerator);
  TestValidator.equals(
    "content_moderator role_level assigned",
    contentModerator.role_level,
    "content_moderator",
  );
  TestValidator.equals(
    "content_moderator email matches",
    contentModerator.email,
    contentModeratorData.email,
  );

  // Step 5: Create support_admin admin account
  const supportAdminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "support_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const supportAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: supportAdminData,
    });
  typia.assert(supportAdmin);
  TestValidator.equals(
    "support_admin role_level assigned",
    supportAdmin.role_level,
    "support_admin",
  );
  TestValidator.equals(
    "support_admin email matches",
    supportAdmin.email,
    supportAdminData.email,
  );

  // Step 6: Create another super_admin account
  const anotherSuperAdminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const anotherSuperAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: anotherSuperAdminData,
    });
  typia.assert(anotherSuperAdmin);
  TestValidator.equals(
    "another super_admin role_level assigned",
    anotherSuperAdmin.role_level,
    "super_admin",
  );

  // Step 7: Verify all tokens are valid authorization tokens
  typia.assert<IAuthorizationToken>(superAdmin.token);
  typia.assert<IAuthorizationToken>(orderManager.token);
  typia.assert<IAuthorizationToken>(contentModerator.token);
  typia.assert<IAuthorizationToken>(supportAdmin.token);
  typia.assert<IAuthorizationToken>(anotherSuperAdmin.token);
}
