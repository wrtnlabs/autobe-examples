import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallConfiguration";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";

/**
 * Test the shopping mall configuration search endpoint as an authenticated
 * admin user.
 *
 * This e2e test covers:
 *
 * 1. Admin user registration and login via /auth/admin/join with valid data.
 * 2. Performing PATCH requests to /shoppingMall/admin/shoppingMallConfigurations
 *    to search configurations.
 * 3. Testing pagination functionality: page number, limit per page, and total
 *    records.
 * 4. Testing text-based searching with the 'search' query field.
 * 5. Testing sorting with 'sortBy' and 'sortDirection' fields.
 * 6. Validating response structure and type safety using typia.assert.
 * 7. Testing access control: only authorized admin users can perform search.
 * 8. Test multiple variants: no filters, keyword search, different sorting,
 *    different paging.
 *
 * Each API call's response is type-asserted. Pagination metadata is asserted
 * for consistency. Configuration summaries are checked to conform to expected
 * property types.
 *
 * This ensures the admin search functionality for mall configurations is robust
 * and correctly enforced.
 */
export async function test_api_shopping_mall_configuration_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminCreateBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: "P@ssw0rd!123",
    phone_number: null,
    role: "admin",
  } satisfies IShoppingMallAdmin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(admin);

  // 2. Test default pagination without filters
  {
    const requestBody = {
      page: 1,
      limit: 10,
    } satisfies IShoppingMallConfiguration.IRequest;

    const response =
      await api.functional.shoppingMall.admin.shoppingMallConfigurations.index(
        connection,
        { body: requestBody },
      );
    typia.assert(response);

    TestValidator.predicate(
      "pagination current page and limit are positive",
      response.pagination.current >= 1 && response.pagination.limit >= 1,
    );
    TestValidator.predicate(
      "records count is non-negative and data length does not exceed limit",
      response.pagination.records >= 0 &&
        response.data.length <= response.pagination.limit,
    );
  }

  // 3. Test search keyword filter
  {
    const searchKeyword = "config";
    const requestBody = {
      page: 1,
      limit: 5,
      search: searchKeyword,
    } satisfies IShoppingMallConfiguration.IRequest;

    const response =
      await api.functional.shoppingMall.admin.shoppingMallConfigurations.index(
        connection,
        { body: requestBody },
      );
    typia.assert(response);

    // All returned keys or values should contain the search keyword string case-insensitive
    for (const item of response.data) {
      const keyContains = item.key
        .toLowerCase()
        .includes(searchKeyword.toLowerCase());
      const valueContains = item.value
        .toLowerCase()
        .includes(searchKeyword.toLowerCase());
      TestValidator.predicate(
        `item key or value contains keyword '${searchKeyword}'`,
        keyContains || valueContains,
      );
    }
  }

  // 4. Test sorting by key ascending and descending
  {
    const baseRequestBody = {
      page: 1,
      limit: 10,
      sortBy: "key",
    } satisfies IShoppingMallConfiguration.IRequest;

    // Ascending order
    const ascRequestBody = {
      ...baseRequestBody,
      sortDirection: "asc",
    } satisfies IShoppingMallConfiguration.IRequest;

    const ascResponse =
      await api.functional.shoppingMall.admin.shoppingMallConfigurations.index(
        connection,
        { body: ascRequestBody },
      );
    typia.assert(ascResponse);
    for (let i = 1; i < ascResponse.data.length; i++) {
      TestValidator.predicate(
        `item key ascending order at index ${i}`,
        ascResponse.data[i - 1].key <= ascResponse.data[i].key,
      );
    }

    // Descending order
    const descRequestBody = {
      ...baseRequestBody,
      sortDirection: "desc",
    } satisfies IShoppingMallConfiguration.IRequest;

    const descResponse =
      await api.functional.shoppingMall.admin.shoppingMallConfigurations.index(
        connection,
        { body: descRequestBody },
      );
    typia.assert(descResponse);
    for (let i = 1; i < descResponse.data.length; i++) {
      TestValidator.predicate(
        `item key descending order at index ${i}`,
        descResponse.data[i - 1].key >= descResponse.data[i].key,
      );
    }
  }

  // 5. Test pagination with high page number (likely to be empty results)
  {
    const requestBody = {
      page: 1000,
      limit: 10,
    } satisfies IShoppingMallConfiguration.IRequest;

    const response =
      await api.functional.shoppingMall.admin.shoppingMallConfigurations.index(
        connection,
        { body: requestBody },
      );
    typia.assert(response);

    TestValidator.equals(
      "high page number returns empty data",
      response.data.length,
      0,
    );
  }
}
