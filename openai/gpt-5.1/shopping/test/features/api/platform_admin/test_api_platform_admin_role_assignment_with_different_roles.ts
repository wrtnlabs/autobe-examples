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
 * Validate multiple role assignments for a single platform admin.
 *
 * Business goal: Ensure that a single platform administrator can be granted
 * multiple distinct admin roles simultaneously, and that each role assignment
 * results in a separate active assignment record correctly linked to both the
 * platform admin and the corresponding role definition.
 *
 * Steps:
 *
 * 1. Register and authenticate a platform admin via POST /auth/platformAdmin/join.
 * 2. Create two distinct admin roles via POST
 *    /shoppingMall/platformAdmin/adminRoles.
 * 3. Assign each role to the same platform admin via POST
 *    /shoppingMall/platformAdmin/platformAdmins/{platformAdminId}/roleAssignments.
 * 4. Validate that both assignments are active, have distinct IDs, and that their
 *    nested summaries correctly reference the same platform admin and their
 *    respective roles.
 */
export async function test_api_platform_admin_role_assignment_with_different_roles(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    // ip is optional; omit it to keep the payload simple and valid.
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create two distinct admin roles
  const roleCode1 = `SUPPORT_AGENT_${RandomGenerator.alphaNumeric(6)}`;
  const roleCode2 = `RISK_ANALYST_${RandomGenerator.alphaNumeric(6)}`;

  const roleCreateBody1 = {
    code: roleCode1,
    name: RandomGenerator.name(),
    description_text: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallAdminRole.ICreate;

  const roleCreateBody2 = {
    code: roleCode2,
    name: RandomGenerator.name(),
    description_text: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallAdminRole.ICreate;

  const role1: IShoppingMallAdminRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.create(
      connection,
      { body: roleCreateBody1 },
    );
  typia.assert(role1);

  const role2: IShoppingMallAdminRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.create(
      connection,
      { body: roleCreateBody2 },
    );
  typia.assert(role2);

  // 3. Assign each role to the same platform admin
  const assignmentBody1 = {
    shopping_mall_admin_role_id: role1.id,
  } satisfies IShoppingMallAdminRoleAssignment.ICreate;

  const assignmentBody2 = {
    shopping_mall_admin_role_id: role2.id,
  } satisfies IShoppingMallAdminRoleAssignment.ICreate;

  const assignment1: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.roleAssignments.create(
      connection,
      {
        platformAdminId: admin.id,
        body: assignmentBody1,
      },
    );
  typia.assert(assignment1);

  const assignment2: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.roleAssignments.create(
      connection,
      {
        platformAdminId: admin.id,
        body: assignmentBody2,
      },
    );
  typia.assert(assignment2);

  // 4. Validate business rules and relationships

  // 4.1. Assignments must have distinct IDs
  TestValidator.notEquals(
    "role assignments for different roles must have distinct ids",
    assignment1.id,
    assignment2.id,
  );

  // 4.2. Both assignments should be active (revoked_at is null or undefined)
  TestValidator.predicate(
    "first assignment is active (revoked_at is null or undefined)",
    assignment1.revoked_at === null || assignment1.revoked_at === undefined,
  );
  TestValidator.predicate(
    "second assignment is active (revoked_at is null or undefined)",
    assignment2.revoked_at === null || assignment2.revoked_at === undefined,
  );

  // 4.3. Both assignments must reference the same platform admin
  TestValidator.equals(
    "first assignment platform_admin.id matches joined admin id",
    assignment1.platform_admin.id,
    admin.id,
  );
  TestValidator.equals(
    "second assignment platform_admin.id matches joined admin id",
    assignment2.platform_admin.id,
    admin.id,
  );

  // 4.4. Each assignment must reference the correct role
  TestValidator.equals(
    "first assignment admin_role.id matches first created role id",
    assignment1.admin_role.id,
    role1.id,
  );
  TestValidator.equals(
    "second assignment admin_role.id matches second created role id",
    assignment2.admin_role.id,
    role2.id,
  );

  TestValidator.equals(
    "first assignment admin_role.code matches first created role code",
    assignment1.admin_role.code,
    role1.code,
  );
  TestValidator.equals(
    "second assignment admin_role.code matches second created role code",
    assignment2.admin_role.code,
    role2.code,
  );

  // 4.5. Sanity check: assigned_at must be non-empty strings (already date-time by type)
  TestValidator.predicate(
    "first assignment has assigned_at populated",
    assignment1.assigned_at.length > 0,
  );
  TestValidator.predicate(
    "second assignment has assigned_at populated",
    assignment2.assigned_at.length > 0,
  );
}
