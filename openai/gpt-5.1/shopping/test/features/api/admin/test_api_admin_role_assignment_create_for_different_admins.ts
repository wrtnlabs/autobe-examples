import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";
import type { IShoppingMallAdminRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRoleAssignment";

/**
 * Verify that the same admin role can be assigned to multiple different admins.
 *
 * Business purpose:
 *
 * - Ensure the RBAC system allows one role definition to be shared among multiple
 *   administrator accounts.
 * - Confirm that the uniqueness constraint on admin role assignments is on the
 *   pair (role, admin) so that creating assignments for different admins under
 *   the same role code does not violate constraints.
 *
 * Test flow:
 *
 * 1. Register the first admin (operator) using POST /auth/admin/join. This also
 *    sets the connection Authorization header to the operator’s access token.
 * 2. Register a second admin using POST /auth/admin/join. Even though this call
 *    would normally switch the token to the second admin, for this scenario we
 *    only need both admin IDs and don’t rely on the token after this step.
 * 3. While authenticated as whichever admin the SDK last set on the connection,
 *    create a new role via POST /shoppingMall/admin/adminRoles with
 *    IShoppingMallAdminRole.ICreate. Use a random but unique-looking `code` and
 *    capture that same code locally for the subsequent assignment requests.
 * 4. Create the first role assignment by calling POST
 *    /shoppingMall/admin/adminRoles/{adminRoleCode}/assignments with
 *    IShoppingMallAdminRoleAssignment.ICreate where `admin_id` is the first
 *    admin’s UUID. Assert that the response is a valid
 *    IShoppingMallAdminRoleAssignment and keep its id and
 *    shopping_mall_admin_role_id.
 * 5. Create the second role assignment with the same adminRoleCode but with
 *    `admin_id` set to the second admin’s UUID. Assert success and capture the
 *    returned assignment.
 * 6. Validate business rules:
 *
 *    - Both assignments have different primary ids.
 *    - Both assignments reference the same role id (shopping_mall_admin_role_id).
 *    - The shopping_mall_admin_id is different between the two assignments, proving
 *         that the role was granted to two distinct admins.
 *
 * Index/read operations for assignments are not provided in the SDK materials,
 * so verification is performed directly on the two create responses rather than
 * via a separate listing step.
 */
export async function test_api_admin_role_assignment_create_for_different_admins(
  connection: api.IConnection,
) {
  // 1. Register first admin (operator)
  const firstJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallAdminJoin.ICreate,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(firstJoin);

  const firstAdminId = firstJoin.id;

  // 2. Register second admin; we just need its id
  const secondJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallAdminJoin.ICreate,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(secondJoin);

  const secondAdminId = secondJoin.id;

  // 3. Create a new role while authenticated as the last joined admin.
  const roleRequestBody = {
    code: `role_${RandomGenerator.alphaNumeric(12)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_system: false,
  } satisfies IShoppingMallAdminRole.ICreate;

  const createdRole = await api.functional.shoppingMall.admin.adminRoles.create(
    connection,
    {
      body: roleRequestBody,
    },
  );
  typia.assert<IShoppingMallAdminRole>(createdRole);

  const adminRoleCode = roleRequestBody.code;

  // 4. Create first assignment for the first admin
  const firstAssignmentBody = {
    admin_id: firstAdminId,
    reason: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallAdminRoleAssignment.ICreate;

  const firstAssignment =
    await api.functional.shoppingMall.admin.adminRoles.assignments.create(
      connection,
      {
        adminRoleCode,
        body: firstAssignmentBody,
      },
    );
  typia.assert<IShoppingMallAdminRoleAssignment>(firstAssignment);

  // 5. Create second assignment for the second admin using same role code
  const secondAssignmentBody = {
    admin_id: secondAdminId,
    reason: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallAdminRoleAssignment.ICreate;

  const secondAssignment =
    await api.functional.shoppingMall.admin.adminRoles.assignments.create(
      connection,
      {
        adminRoleCode,
        body: secondAssignmentBody,
      },
    );
  typia.assert<IShoppingMallAdminRoleAssignment>(secondAssignment);

  // 6. Business assertions
  TestValidator.notEquals(
    "role assignments should have different primary ids",
    firstAssignment.id,
    secondAssignment.id,
  );

  TestValidator.equals(
    "both assignments reference the same role id",
    firstAssignment.shopping_mall_admin_role_id,
    secondAssignment.shopping_mall_admin_role_id,
  );

  TestValidator.notEquals(
    "assignments must target different admins",
    firstAssignment.shopping_mall_admin_id,
    secondAssignment.shopping_mall_admin_id,
  );
}
