import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserRole";

/**
 * Tests the deletion of a user role by an admin.
 *
 * This test verifies that an admin can successfully authenticate, create a user
 * role, and delete it. This flow validates access control, role assignment, and
 * deletion workflows.
 *
 * Steps:
 *
 * 1. Admin registers via join operation.
 * 2. Admin creates a user role with random but valid user_id and role_name.
 * 3. Admin deletes the created user role by its id.
 * 4. Verifies no exceptions occur during delete.
 *
 * All values respect schemas and constraints, with typia.assert validation.
 */
export async function test_api_user_role_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin authenticates via join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "adminPass123!",
        full_name: RandomGenerator.name(2),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Admin creates a user role
  const userRoleCreateBody = {
    user_id: typia.random<string & tags.Format<"uuid">>(),
    role_name: RandomGenerator.pick(["admin", "seller", "customer"] as const),
  } satisfies IShoppingMallUserRole.ICreate;
  const createdUserRole: IShoppingMallUserRole =
    await api.functional.shoppingMall.admin.userRoles.create(connection, {
      body: userRoleCreateBody,
    });
  typia.assert(createdUserRole);

  // 3. Admin deletes the created user role
  await api.functional.shoppingMall.admin.userRoles.erase(connection, {
    id: createdUserRole.id,
  });
}
