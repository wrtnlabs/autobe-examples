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
 * Basic creation of a platform admin role assignment.
 *
 * ## Business purpose
 *
 * This test ensures that a freshly joined platform administrator can define a
 * new admin role and immediately assign that role to themself using the
 * platform admin role assignment API. It validates the happy path for the
 * minimal assignment workflow without involving additional admins or revocation
 * flows.
 *
 * ## High-level steps
 *
 * 1. Register a new platform admin using POST /auth/platformAdmin/join to obtain
 *    an authenticated platform admin session (IAuthorized) with JWT tokens
 *    automatically wired into the SDK connection.
 * 2. Using that authorized context, create a new admin role definition via POST
 *    /shoppingMall/platformAdmin/adminRoles with a unique code and name.
 * 3. Call POST
 *    /shoppingMall/platformAdmin/platformAdmins/{platformAdminId}/roleAssignments
 *    to create a role assignment that links the same platform admin to the
 *    newly created role.
 * 4. Validate that the returned IShoppingMallAdminRoleAssignment object contains
 *    the expected references and lifecycle fields: a generated assignment id,
 *    platform_admin summary bound to the joined admin, admin_role summary
 *    consistent with the created role, a non-null assigned_at timestamp, and a
 *    revoked_at field that is null/undefined to represent an active
 *    assignment.
 *
 * ## Validations
 *
 * - All responses are structurally valid via typia.assert.
 * - The platform admin from the join endpoint is active (isActive is true).
 * - The role assignment platform_admin.id matches the joined admin id.
 * - The role assignment admin_role.id matches the created role id.
 * - The role assignment admin_role.code and .name match the creation payload.
 * - Assigned_at is a non-empty string (exact format guaranteed by typia).
 * - Revoked_at is null or undefined right after creation.
 */
export async function test_api_platform_admin_role_assignment_creation_basic(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin and obtain an authorized session.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const authorizedAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedAdmin);

  // Basic sanity check: admin should be active.
  TestValidator.predicate(
    "joined platform admin must be active",
    authorizedAdmin.isActive === true,
  );

  // 2. Create a new admin role definition with unique code and name.
  const roleCode = `role_${RandomGenerator.alphaNumeric(12)}`;
  const roleName = RandomGenerator.paragraph({ sentences: 2 });

  const createRoleBody = {
    code: roleCode,
    name: roleName,
    description_text: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallAdminRole.ICreate;

  const createdRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.create(
      connection,
      { body: createRoleBody },
    );
  typia.assert(createdRole);

  // 3. Create a role assignment for the same platform admin.
  const createAssignmentBody = {
    shopping_mall_admin_role_id: createdRole.id,
  } satisfies IShoppingMallAdminRoleAssignment.ICreate;

  const assignment: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.roleAssignments.create(
      connection,
      {
        platformAdminId: authorizedAdmin.id,
        body: createAssignmentBody,
      },
    );
  typia.assert(assignment);

  // 4. Validate linkage and lifecycle fields.

  // Assignment should reference the same platform admin.
  TestValidator.equals(
    "assignment.platform_admin.id should match joined admin id",
    assignment.platform_admin.id,
    authorizedAdmin.id,
  );

  // Assignment should reference the created role.
  TestValidator.equals(
    "assignment.admin_role.id should match created role id",
    assignment.admin_role.id,
    createdRole.id,
  );

  TestValidator.equals(
    "assignment.admin_role.code should match created role code",
    assignment.admin_role.code,
    createdRole.code,
  );

  TestValidator.equals(
    "assignment.admin_role.name should match created role name",
    assignment.admin_role.name,
    createdRole.name,
  );

  // assigned_at must be a non-empty string (typia.assert already guarantees format).
  TestValidator.predicate(
    "assignment.assigned_at must be a non-empty string",
    assignment.assigned_at.length > 0,
  );

  // revoked_at should be null or undefined immediately after creation.
  TestValidator.predicate(
    "assignment.revoked_at should be null or undefined on creation",
    assignment.revoked_at === null || assignment.revoked_at === undefined,
  );
}
