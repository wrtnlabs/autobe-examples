import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";
import type { IShoppingMallAdminRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRoleAssignment";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Verify that duplicate admin role assignments for the same platform admin and
 * role are prevented by the API/business logic.
 *
 * Business workflow:
 *
 * 1. Register a new platform administrator via POST /auth/platformAdmin/join to
 *    obtain an authenticated platformAdmin session and its administrator id.
 * 2. Create a new admin role definition via POST
 *    /shoppingMall/platformAdmin/adminRoles using a unique role code.
 * 3. Assign that role to the platform administrator once via POST
 *    /shoppingMall/platformAdmin/platformAdmins/{platformAdminId}/roleAssignments
 *    and verify the assignment links the expected admin and role.
 * 4. Attempt to assign the same role to the same platform admin a second time
 *    using the identical (platformAdminId, shopping_mall_admin_role_id) pair.
 * 5. Assert that the second assignment attempt fails with a domain-level error
 *    (e.g., unique constraint / conflict) and that only the first assignment
 *    succeeds.
 */
export async function test_api_platform_admin_role_assignment_prevents_duplicates(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator (join) to get an authorized session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://shoppingmall.local/landing/platform-admin",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create a new admin role definition
  const roleCodeBase = RandomGenerator.alphaNumeric(8).toUpperCase();
  const roleBody = {
    code: roleCodeBase,
    name: `Role ${roleCodeBase}`,
    description_text: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallAdminRole.ICreate;

  const adminRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.create(
      connection,
      {
        body: roleBody,
      },
    );
  typia.assert(adminRole);

  // 3. First role assignment should succeed
  const firstAssignmentBody = {
    shopping_mall_admin_role_id: adminRole.id,
  } satisfies IShoppingMallAdminRoleAssignment.ICreate;

  const firstAssignment: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.roleAssignments.create(
      connection,
      {
        platformAdminId: platformAdmin.id,
        body: firstAssignmentBody,
      },
    );
  typia.assert(firstAssignment);

  // Validate that the assignment links to the expected admin and role
  TestValidator.equals(
    "first assignment platform admin id should match join result",
    firstAssignment.platform_admin.id,
    platformAdmin.id,
  );
  TestValidator.equals(
    "first assignment admin role id should match created role",
    firstAssignment.admin_role.id,
    adminRole.id,
  );

  // 4. Second duplicate role assignment should fail
  const secondAssignmentBody = {
    shopping_mall_admin_role_id: adminRole.id,
  } satisfies IShoppingMallAdminRoleAssignment.ICreate;

  await TestValidator.error(
    "duplicate role assignment for same admin and role should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.platformAdmins.roleAssignments.create(
        connection,
        {
          platformAdminId: platformAdmin.id,
          body: secondAssignmentBody,
        },
      );
    },
  );
}
