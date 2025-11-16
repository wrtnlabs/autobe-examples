import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";
import type { IShoppingMallAdminRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRoleAssignment";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_role_assignment_retrieval_nonexistent(
  connection: api.IConnection,
) {
  // 1. Join/register a platform administrator so we have a valid actor context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create an admin role definition that can be assigned.
  const roleCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description_text: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IShoppingMallAdminRole.ICreate;

  const role: IShoppingMallAdminRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.create(
      connection,
      {
        body: roleCreateBody,
      },
    );
  typia.assert(role);

  // 3. Assign the created role to the joined platform administrator.
  const assignmentCreateBody = {
    shopping_mall_admin_role_id: role.id,
  } satisfies IShoppingMallAdminRoleAssignment.ICreate;

  const createdAssignment: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.roleAssignments.create(
      connection,
      {
        platformAdminId: adminAuthorized.id,
        body: assignmentCreateBody,
      },
    );
  typia.assert(createdAssignment);

  // 4. Retrieve the same assignment via the GET /roleAssignments/{roleAssignmentId} endpoint.
  const readAssignment: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.roleAssignments.at(
      connection,
      {
        platformAdminId: adminAuthorized.id,
        roleAssignmentId: createdAssignment.id,
      },
    );
  typia.assert(readAssignment);

  // 5. Business-level validations.
  TestValidator.equals(
    "retrieved assignment id matches created assignment id",
    readAssignment.id,
    createdAssignment.id,
  );

  TestValidator.equals(
    "retrieved assignment belongs to the same platform admin",
    readAssignment.platform_admin.id,
    adminAuthorized.id,
  );

  TestValidator.equals(
    "retrieved assignment role id matches created role id",
    readAssignment.admin_role.id,
    role.id,
  );

  // Ensure assigned_at is present and revocation has not yet occurred.
  TestValidator.predicate(
    "assignment has a non-empty assigned_at timestamp",
    readAssignment.assigned_at.length > 0,
  );

  TestValidator.equals(
    "newly created assignment is not revoked",
    readAssignment.revoked_at ?? null,
    null,
  );
}
