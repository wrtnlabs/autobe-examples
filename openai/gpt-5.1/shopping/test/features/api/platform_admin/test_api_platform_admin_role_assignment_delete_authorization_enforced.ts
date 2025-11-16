import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";
import type { IShoppingMallAdminRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRoleAssignment";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_role_assignment_delete_authorization_enforced(
  connection: api.IConnection,
) {
  /** 1. Register a new platform administrator and obtain an authenticated session. */
  const joinRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const authorizedAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequestBody,
    });
  typia.assert(authorizedAdmin);

  const platformAdminId: string = authorizedAdmin.id;

  /** 2. Create a new admin role definition. */
  const roleCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description_text: null,
  } satisfies IShoppingMallAdminRole.ICreate;

  const adminRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.create(
      connection,
      {
        body: roleCreateBody,
      },
    );
  typia.assert(adminRole);

  /** 3. Create a role assignment for the newly created platform admin and role. */
  const roleAssignmentCreateBody = {
    shopping_mall_admin_role_id: adminRole.id,
  } satisfies IShoppingMallAdminRoleAssignment.ICreate;

  const assignment: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.roleAssignments.create(
      connection,
      {
        platformAdminId,
        body: roleAssignmentCreateBody,
      },
    );
  typia.assert(assignment);

  const roleAssignmentId: string = assignment.id;

  /**
   * 4. Prepare an unauthenticated connection by cloning the original connection
   *    but providing an empty headers object. Do not mutate the original
   *    connection headers.
   */
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  /**
   * 5. Attempt to delete the role assignment without authentication and expect an
   *    error.
   */
  await TestValidator.error(
    "unauthenticated erase must be rejected",
    async () => {
      await api.functional.shoppingMall.platformAdmin.platformAdmins.roleAssignments.erase(
        anonymousConnection,
        {
          platformAdminId,
          roleAssignmentId,
        },
      );
    },
  );

  /**
   * 6. Delete the role assignment again, this time using the authenticated
   *    platform admin connection. This should succeed without throwing.
   */
  await api.functional.shoppingMall.platformAdmin.platformAdmins.roleAssignments.erase(
    connection,
    {
      platformAdminId,
      roleAssignmentId,
    },
  );
}
