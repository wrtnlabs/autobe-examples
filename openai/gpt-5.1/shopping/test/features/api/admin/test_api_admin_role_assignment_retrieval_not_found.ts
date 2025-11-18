import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";
import type { IShoppingMallAdminRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRoleAssignment";

export async function test_api_admin_role_assignment_retrieval_not_found(
  connection: api.IConnection,
) {
  // 1. Admin bootstrap & authentication via join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create an admin role
  const roleCreateBody = {
    code: `role_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_system: false,
  } satisfies IShoppingMallAdminRole.ICreate;

  const role: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.create(connection, {
      body: roleCreateBody,
    });
  typia.assert<IShoppingMallAdminRole>(role);

  // 3. Create a role assignment for the joined admin
  const targetAdminId: string & tags.Format<"uuid"> = adminAuthorized.id;

  const assignmentCreateBody = {
    admin_id: targetAdminId,
    reason: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallAdminRoleAssignment.ICreate;

  const assignment: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.admin.adminRoles.assignments.create(
      connection,
      {
        adminRoleCode: role.code,
        body: assignmentCreateBody,
      },
    );
  typia.assert<IShoppingMallAdminRoleAssignment>(assignment);

  // 4. Successful retrieval sanity check
  const fetched: IShoppingMallAdminRoleAssignment =
    await api.functional.shoppingMall.admin.adminRoleAssignments.at(
      connection,
      {
        adminRoleAssignmentId: assignment.id,
      },
    );
  typia.assert<IShoppingMallAdminRoleAssignment>(fetched);

  TestValidator.equals(
    "fetched assignment id should match original assignment id",
    fetched.id,
    assignment.id,
  );

  TestValidator.equals(
    "fetched admin id should match original admin id",
    fetched.shopping_mall_admin_id,
    assignment.shopping_mall_admin_id,
  );

  TestValidator.equals(
    "fetched role id should match original role id",
    fetched.shopping_mall_admin_role_id,
    assignment.shopping_mall_admin_role_id,
  );

  // 5. Not-found retrieval path: use a random UUID that does not match the real assignment id
  let nonexistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (nonexistentId === assignment.id) {
    // Extremely unlikely, but reroll once to be safe.
    nonexistentId = typia.random<string & tags.Format<"uuid">>();
  }

  await TestValidator.httpError(
    "non-existent admin role assignment returns 404 not-found",
    404,
    async () => {
      await api.functional.shoppingMall.admin.adminRoleAssignments.at(
        connection,
        {
          adminRoleAssignmentId: nonexistentId,
        },
      );
    },
  );
}
