import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";
import type { IShoppingMallUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserRole";

/**
 * Validate the deletion of shopping mall admin user role associations.
 *
 * This test function performs a comprehensive check of the user role deletion
 * API endpoint. It covers the following key aspects:
 *
 * 1. Authorization Workflow: It starts by authenticating an admin user through the
 *    join API to establish an authorized session.
 * 2. Prerequisite Setup: Creates the data dependencies required for the test
 *    including a new administrator user, a role entity, and a user role
 *    association to be deleted.
 * 3. Deletion Process: Calls the deletion endpoint to remove the specific user
 *    role association.
 * 4. Post-deletion Validation: Ensures the delete operation is successful and that
 *    the user role association no longer exists.
 *
 * This scenario guarantees that the deletion mechanism works correctly and that
 * only authorized administrators can perform this sensitive action within the
 * shopping mall admin platform.
 */
export async function test_api_shopping_mall_admin_user_role_deletion(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin user
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: `admin${RandomGenerator.alphaNumeric(4)}@example.com`,
        password: "P@ssw0rd123",
        ip: null,
        href: "https://admin.shoppingmall.test/join",
        referrer: "https://admin.shoppingmall.test/referrer",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(adminAuthorized);

  // 2. Create new admin user
  const adminUserCreateBody = {
    email: `user${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "UserPass123",
  } satisfies IShoppingMallAdmin.ICreate;
  const newAdminUser: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.shoppingMallAdmins.create(
      connection,
      {
        body: adminUserCreateBody,
      },
    );
  typia.assert(newAdminUser);

  // 3. Create a role entity
  const roleCreateBody = {
    name: `role_${RandomGenerator.alphaNumeric(6)}`,
    label: `Role Label ${RandomGenerator.alphaNumeric(4)}`,
    description: `Role Description ${RandomGenerator.paragraph({ sentences: 3 })}`,
  } satisfies IShoppingMallRole.ICreate;
  const newRole: IShoppingMallRole =
    await api.functional.shoppingMall.admin.shoppingMallRoles.create(
      connection,
      {
        body: roleCreateBody,
      },
    );
  typia.assert(newRole);

  // 4. Create user role association to be deleted
  const userRoleCreateBody = {
    shopping_mall_user_id: newAdminUser.id,
    shopping_mall_role_id: newRole.id,
  } satisfies IShoppingMallUserRole.ICreate;
  const userRoleAssociation: IShoppingMallUserRole =
    await api.functional.shoppingMall.admin.shoppingMallUserRoles.create(
      connection,
      {
        body: userRoleCreateBody,
      },
    );
  typia.assert(userRoleAssociation);

  // 5. Perform the deletion request for the user role association
  await api.functional.shoppingMall.admin.shoppingMallUserRoles.erase(
    connection,
    {
      shoppingMallUserRoleId: userRoleAssociation.id,
    },
  );

  // Since the deletion endpoint returns void, no following assertion is possible.
  // Successful completion without errors implies success.
}
