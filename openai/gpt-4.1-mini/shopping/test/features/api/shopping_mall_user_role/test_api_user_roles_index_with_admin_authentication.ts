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
 * Test retrieving a paginated list of user roles with admin authentication to
 * verify filtering and pagination functionality.
 *
 * This test covers the main admin authentication and valid user roles listing.
 *
 * 1. Admin joins and authenticates to obtain token
 * 2. Requests paged user role list with default and specified parameters
 * 3. Validates the API responses against expected structure and pagination
 * 4. Tests filtering by role_name and user_id
 */
export async function test_api_user_roles_index_with_admin_authentication(
  connection: api.IConnection,
) {
  // Step 1: Admin join and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminFullName = RandomGenerator.name();
  const adminPassword = "AdminPass123!";

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: adminFullName,
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // Validate admin token is present
  TestValidator.predicate(
    "admin token access exists",
    typeof admin.token.access === "string" && admin.token.access.length > 0,
  );

  // Step 2: Request paginated user roles list with default pagination
  const defaultPageBody = {} satisfies IShoppingMallUserRole.IRequest;
  const defaultPage: IPageIShoppingMallUserRole.ISummary =
    await api.functional.shoppingMall.admin.userRoles.index(connection, {
      body: defaultPageBody,
    });
  typia.assert(defaultPage);

  TestValidator.predicate(
    "pagination current page is at least 1",
    defaultPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    defaultPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    defaultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is at least 1",
    defaultPage.pagination.pages >= 1,
  );
  TestValidator.predicate("data is array", Array.isArray(defaultPage.data));

  // Validate each user role summary in data array
  for (const roleSummary of defaultPage.data) {
    typia.assert(roleSummary);
    typia.assert<string & tags.Format<"uuid">>(roleSummary.id);
    typia.assert<string & tags.Format<"uuid">>(roleSummary.user_id);
    TestValidator.predicate(
      "user role role_name is non-empty string",
      typeof roleSummary.role_name === "string" &&
        roleSummary.role_name.length > 0,
    );
  }

  // Step 3: Test filtered query by role_name
  if (defaultPage.data.length > 0) {
    const sampleRoleName = defaultPage.data[0].role_name;
    const filterByRoleBody = {
      role_name: sampleRoleName,
    } satisfies IShoppingMallUserRole.IRequest;
    const filteredByRole: IPageIShoppingMallUserRole.ISummary =
      await api.functional.shoppingMall.admin.userRoles.index(connection, {
        body: filterByRoleBody,
      });
    typia.assert(filteredByRole);
    TestValidator.predicate(
      "filtered roles data array",
      Array.isArray(filteredByRole.data),
    );

    // All returned roles should have role_name equal to sampleRoleName
    for (const roleSummary of filteredByRole.data) {
      TestValidator.equals(
        "filtered role name matches",
        roleSummary.role_name,
        sampleRoleName,
      );
    }
  }

  // Step 4: Test filtered query by user_id
  if (defaultPage.data.length > 0) {
    const sampleUserId = defaultPage.data[0].user_id;
    const filterByUserIdBody = {
      user_id: sampleUserId,
    } satisfies IShoppingMallUserRole.IRequest;
    const filteredByUserId: IPageIShoppingMallUserRole.ISummary =
      await api.functional.shoppingMall.admin.userRoles.index(connection, {
        body: filterByUserIdBody,
      });
    typia.assert(filteredByUserId);
    TestValidator.predicate(
      "filtered user roles data array",
      Array.isArray(filteredByUserId.data),
    );

    // All returned roles should have user_id equal to sampleUserId
    for (const roleSummary of filteredByUserId.data) {
      TestValidator.equals(
        "filtered user_id matches",
        roleSummary.user_id,
        sampleUserId,
      );
    }
  }
}
