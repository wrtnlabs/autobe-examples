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
 * Validate delete semantics for platform admin role assignments.
 *
 * This scenario verifies how the platform-admin-facing delete endpoint for
 * admin role assignments behaves in normal and error situations:
 *
 * 1. A platform admin joins (registration + authentication) so that Authorization
 *    is established.
 * 2. The same admin defines a new admin role via POST
 *    /shoppingMall/platformAdmin/adminRoles.
 * 3. The admin assigns that role to themselves via POST
 *    /shoppingMall/platformAdmin/platformAdmins/{platformAdminId}/roleAssignments.
 * 4. The assignment is deleted once using DELETE
 *    /shoppingMall/platformAdmin/platformAdmins/{platformAdminId}/roleAssignments/{roleAssignmentId}
 *    and is expected to succeed without throwing.
 * 5. The same delete call is executed again for the same assignment id to see
 *    whether the implementation treats it as an error (e.g., not-found) rather
 *    than a no-op; the test asserts that an error is thrown.
 * 6. Finally, the test attempts to delete a clearly non-existent roleAssignmentId
 *    (another random UUID) and asserts that this also results in an error
 *    without impacting any existing assignments.
 *
 * Because there is no list/lookup endpoint wired into this test, absence or
 * presence of the role assignment is inferred from delete behaviours: the first
 * delete must succeed, whereas the second delete and the random-id delete must
 * fail.
 */
export async function test_api_platform_admin_role_assignment_delete_idempotency_and_error_handling(
  connection: api.IConnection,
) {
  // 1. Join as a new platform administrator (auth bootstrap)
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const authorizedAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(authorizedAdmin);

  const platformAdminId: string & tags.Format<"uuid"> = authorizedAdmin.id;

  // 2. Create an admin role definition that can be assigned
  const roleCreateBody = {
    code: `role_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description_text: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallAdminRole.ICreate;

  const createdRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.create(
      connection,
      {
        body: roleCreateBody,
      },
    );
  typia.assert(createdRole);

  // 3. Assign the role to the joined platform admin
  const assignmentBody = {
    shopping_mall_admin_role_id: createdRole.id,
  } satisfies IShoppingMallAdminRoleAssignment.ICreate;

  const assignment: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.roleAssignments.create(
      connection,
      {
        platformAdminId,
        body: assignmentBody,
      },
    );
  typia.assert(assignment);

  const roleAssignmentId: string & tags.Format<"uuid"> = assignment.id;

  // 4. First delete: must succeed without throwing
  await api.functional.shoppingMall.platformAdmin.platformAdmins.roleAssignments.erase(
    connection,
    {
      platformAdminId,
      roleAssignmentId,
    },
  );

  // 5. Second delete with same id: expect an error (non-idempotent behaviour)
  await TestValidator.error(
    "second delete on same role assignment should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.platformAdmins.roleAssignments.erase(
        connection,
        {
          platformAdminId,
          roleAssignmentId,
        },
      );
    },
  );

  // 6. Deleting a clearly non-existent roleAssignmentId should also error
  const randomNonexistentRoleAssignmentId: string & tags.Format<"uuid"> =
    typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "delete on random non-existent roleAssignmentId should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.platformAdmins.roleAssignments.erase(
        connection,
        {
          platformAdminId,
          roleAssignmentId: randomNonexistentRoleAssignmentId,
        },
      );
    },
  );
}
