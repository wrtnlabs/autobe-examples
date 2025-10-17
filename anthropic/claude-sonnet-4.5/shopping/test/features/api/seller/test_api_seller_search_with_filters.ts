import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test comprehensive seller account search and filtering functionality.
 *
 * This test validates that admin users can successfully search and retrieve
 * seller accounts with proper pagination support. The test creates an admin
 * account, authenticates, and then performs seller search operations to verify
 * the search API returns properly structured responses with correct business
 * logic.
 *
 * Steps:
 *
 * 1. Create and authenticate admin user via join endpoint
 * 2. Execute seller search with pagination parameters
 * 3. Validate business logic of pagination calculations
 * 4. Test different pagination parameter combinations
 * 5. Verify pagination behavior with empty request body
 *
 * Note: This test assumes seller accounts already exist in the system.
 */
export async function test_api_seller_search_with_filters(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and authenticate
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Verify admin authentication business logic
  TestValidator.equals(
    "admin email matches input",
    admin.email,
    adminData.email,
  );
  TestValidator.equals(
    "admin role level matches input",
    admin.role_level,
    "super_admin",
  );

  // Step 2: Execute seller search with default pagination
  const searchRequest = {
    page: 0,
    limit: 10,
  } satisfies IShoppingMallSeller.IRequest;

  const searchResult: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.admin.sellers.index(connection, {
      body: searchRequest,
    });
  typia.assert(searchResult);

  // Step 3: Validate pagination business logic
  TestValidator.equals(
    "pagination current page matches request",
    searchResult.pagination.current,
    searchRequest.page,
  );

  TestValidator.equals(
    "pagination limit matches request",
    searchResult.pagination.limit,
    searchRequest.limit,
  );

  TestValidator.predicate(
    "pagination pages calculation is correct",
    searchResult.pagination.pages ===
      Math.ceil(
        searchResult.pagination.records / searchResult.pagination.limit,
      ),
  );

  TestValidator.predicate(
    "data array length does not exceed limit",
    searchResult.data.length <= searchRequest.limit,
  );

  // Step 4: Test with different pagination parameters
  const largerPageRequest = {
    page: 0,
    limit: 20,
  } satisfies IShoppingMallSeller.IRequest;

  const largerPageResult: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.admin.sellers.index(connection, {
      body: largerPageRequest,
    });
  typia.assert(largerPageResult);

  TestValidator.equals(
    "larger limit reflected in pagination",
    largerPageResult.pagination.limit,
    20,
  );

  TestValidator.predicate(
    "larger limit data array respects maximum",
    largerPageResult.data.length <= 20,
  );

  // Step 5: Test with empty request body (all optional parameters)
  const emptyRequest = {} satisfies IShoppingMallSeller.IRequest;

  const defaultResult: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.admin.sellers.index(connection, {
      body: emptyRequest,
    });
  typia.assert(defaultResult);

  TestValidator.predicate(
    "default pagination pages calculation is correct",
    defaultResult.pagination.pages ===
      Math.ceil(
        defaultResult.pagination.records / defaultResult.pagination.limit,
      ),
  );

  // Step 6: Test page navigation if multiple pages exist
  if (searchResult.pagination.pages > 1) {
    const secondPageRequest = {
      page: 1,
      limit: 10,
    } satisfies IShoppingMallSeller.IRequest;

    const secondPageResult: IPageIShoppingMallSeller.ISummary =
      await api.functional.shoppingMall.admin.sellers.index(connection, {
        body: secondPageRequest,
      });
    typia.assert(secondPageResult);

    TestValidator.equals(
      "second page navigation works",
      secondPageResult.pagination.current,
      1,
    );
  }
}
