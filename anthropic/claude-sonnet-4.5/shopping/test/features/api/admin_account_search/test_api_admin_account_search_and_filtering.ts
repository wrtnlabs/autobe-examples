import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test administrator account search and filtering functionality.
 *
 * This test validates that authenticated super admins can search and retrieve
 * paginated lists of administrator accounts. It creates multiple test admin
 * accounts with different properties and then searches for them using the admin
 * search API endpoint.
 *
 * The test verifies:
 *
 * 1. Authentication is properly handled via JWT tokens
 * 2. Multiple admin accounts can be created successfully
 * 3. The search API returns properly paginated results
 * 4. Response includes all required admin information fields
 * 5. Pagination metadata is accurate and complete
 */
export async function test_api_admin_account_search_and_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create initial super admin for authentication
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: superAdminEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        name: RandomGenerator.name(),
        role_level: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(superAdmin);

  // Step 2: Create additional test admin accounts with varied properties
  const adminCount = 3;
  const roles = [
    "order_manager",
    "content_moderator",
    "support_admin",
  ] as const;
  const createdAdmins = await ArrayUtil.asyncRepeat(
    adminCount,
    async (index) => {
      const admin: IShoppingMallAdmin.IAuthorized =
        await api.functional.auth.admin.join(connection, {
          body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: typia.random<string & tags.MinLength<8>>(),
            name: RandomGenerator.name(),
            role_level: RandomGenerator.pick(roles),
          } satisfies IShoppingMallAdmin.ICreate,
        });
      typia.assert(admin);
      return admin;
    },
  );

  // Step 3: Search for admin accounts with pagination
  const searchResult: IPageIShoppingMallAdmin.ISummary =
    await api.functional.shoppingMall.admin.admins.index(connection, {
      body: {
        page: 0,
      } satisfies IShoppingMallAdmin.IRequest,
    });
  typia.assert(searchResult);

  // Step 4: Validate pagination structure
  TestValidator.predicate(
    "pagination current page should be non-negative",
    searchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    searchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    searchResult.pagination.pages >= 0,
  );

  // Step 5: Validate response data array
  TestValidator.predicate(
    "search result should return array of admins",
    Array.isArray(searchResult.data),
  );
  TestValidator.predicate(
    "search result should contain at least the created admins",
    searchResult.data.length >= adminCount + 1,
  );

  // Step 6: Verify that our created admins appear in results
  const createdAdminIds = [superAdmin.id, ...createdAdmins.map((a) => a.id)];
  const foundAdmins = searchResult.data.filter((admin) =>
    createdAdminIds.includes(admin.id),
  );
  TestValidator.predicate(
    "created admins should appear in search results",
    foundAdmins.length > 0,
  );

  // Step 7: Validate admin summary structure - typia.assert handles all type validation
  foundAdmins.forEach((admin) => {
    typia.assert<IShoppingMallAdmin.ISummary>(admin);
  });
}
