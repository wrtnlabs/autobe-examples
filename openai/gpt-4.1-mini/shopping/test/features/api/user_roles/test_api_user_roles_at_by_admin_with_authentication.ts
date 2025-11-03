import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallUserRole";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserRole";

/**
 * This test function validates authorized admin user actions to retrieve a user
 * role by ID.
 *
 * It follows these steps:
 *
 * 1. Admin user signs up using a valid email, password, and full_name.
 * 2. The admin calls the patch endpoint to get a paginated list of user roles
 *    filtered by user_id and role_name.
 * 3. Using the returned user role id from listing with matching user_id and
 *    role_name, the admin fetches the role details using the GET endpoint.
 * 4. Validates that the fetched user role matches the listed data with respect to
 *    id, user_id, and role_name.
 * 5. Ensures timestamps created_at and updated_at are present and valid ISO 8601
 *    strings.
 */
export async function test_api_user_roles_at_by_admin_with_authentication(
  connection: api.IConnection,
) {
  // 1. Admin user registration (join) to receive an authorization token
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "StrongPassword123!",
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Request user roles list filtered by the user_id and role_name
  const testUserId: string = typia.random<string & tags.Format<"uuid">>();
  const roleNameOptions = ["admin", "seller", "customer"] as const;
  const testRoleName = RandomGenerator.pick(roleNameOptions);

  const userRoleRequest = {
    user_id: testUserId,
    role_name: testRoleName,
    page: 1,
    limit: 10,
  } satisfies IShoppingMallUserRole.IRequest;

  const userRolesPage: IPageIShoppingMallUserRole.ISummary =
    await api.functional.shoppingMall.admin.userRoles.index(connection, {
      body: userRoleRequest,
    });
  typia.assert(userRolesPage);

  // Find user role matching user_id and role_name
  const matchedUserRole = userRolesPage.data.find(
    (role) => role.user_id === testUserId && role.role_name === testRoleName,
  );

  TestValidator.predicate(
    "matched user role must be found in user roles list",
    matchedUserRole !== undefined && matchedUserRole !== null,
  );
  typia.assert(matchedUserRole!);

  // 3. Fetch the user role details by id
  const userRoleId = matchedUserRole!.id;
  const userRoleDetail: IShoppingMallUserRole =
    await api.functional.shoppingMall.admin.userRoles.at(connection, {
      id: userRoleId,
    });
  typia.assert(userRoleDetail);

  // 4. Validate that the fetched details match the matching user role
  TestValidator.equals(
    "user role id matches",
    userRoleDetail.id,
    matchedUserRole!.id,
  );
  TestValidator.equals(
    "user role user_id matches",
    userRoleDetail.user_id,
    matchedUserRole!.user_id,
  );
  TestValidator.equals(
    "user role role_name matches",
    userRoleDetail.role_name,
    matchedUserRole!.role_name,
  );

  // 5. Validate timestamps presence and format (ISO 8601 UTC format)
  TestValidator.predicate(
    "created_at is a valid ISO 8601 string",
    typeof userRoleDetail.created_at === "string" &&
      /^[\d]{4}-[\d]{2}-[\d]{2}T[\d]{2}:[\d]{2}:[\d]{2}Z$/.test(
        userRoleDetail.created_at,
      ),
  );
  TestValidator.predicate(
    "updated_at is a valid ISO 8601 string",
    typeof userRoleDetail.updated_at === "string" &&
      /^[\d]{4}-[\d]{2}-[\d]{2}T[\d]{2}:[\d]{2}:[\d]{2}Z$/.test(
        userRoleDetail.updated_at,
      ),
  );
}
