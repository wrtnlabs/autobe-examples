import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSkuOptionGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSkuOptionGroup";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSkuOptionGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOptionGroup";

/**
 * This test covers the scenario where a new customer registers and performs a
 * search for SKU option groups.
 *
 * Steps:
 *
 * 1. Register a new customer account via /auth/customer/join
 * 2. Authenticate the customer and obtain tokens
 * 3. Perform a PATCH request to /shoppingMall/customer/shoppingMallSkuOptionGroups
 *    with valid search filters, pagination, and sorting
 * 4. Validate the response has status 200 and contains paginated SKU option group
 *    summaries consistent with the search
 * 5. Assert the pagination metadata is accurate and logical
 */
export async function test_api_shopping_mall_sku_option_groups_search_by_customer(
  connection: api.IConnection,
) {
  // 1. Register new customer
  const newCustomerEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const newCustomerPassword = "12345678";
  const newCustomerName = RandomGenerator.name();

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: newCustomerEmail,
        password: newCustomerPassword,
        full_name: newCustomerName,
        ip: null,
        href: "https://test.local/signup",
        referrer: "https://test.local/",
      } satisfies IShoppingMallCustomer.ICreate,
    });

  typia.assert(authorizedCustomer);

  // Prepare search filters
  const requestBody = {
    page: 1,
    limit: 10,
    search: null,
    sortBy: "name",
    sortOrder: "asc",
  } satisfies IShoppingMallSkuOptionGroup.IRequest;

  // 2. Perform the PATCH request to search SKU option groups
  const searchResult: IPageIShoppingMallSkuOptionGroup.ISummary =
    await api.functional.shoppingMall.customer.shoppingMallSkuOptionGroups.index(
      connection,
      {
        body: requestBody,
      },
    );

  typia.assert(searchResult);

  // 3. Validate pagination metadata
  const pagination: IPage.IPagination = searchResult.pagination;

  TestValidator.predicate(
    "pagination.current page number should be at least 1",
    pagination.current >= 1,
  );

  TestValidator.predicate(
    "pagination.limit must be between 1 and 100",
    pagination.limit >= 1 && pagination.limit <= 100,
  );

  TestValidator.predicate(
    "pagination.pages must be greater or equal to 1",
    pagination.pages >= 1,
  );

  TestValidator.predicate(
    "pagination.records must be non-negative",
    pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination.pages equals ceil(records / limit)",
    pagination.pages === Math.ceil(pagination.records / pagination.limit),
  );

  TestValidator.predicate(
    "pagination.current should not exceed pagination.pages",
    pagination.current <= pagination.pages,
  );

  // 4. Validate that data array length does not exceed limit
  TestValidator.predicate(
    "data array length should be within the limit",
    searchResult.data.length <= pagination.limit,
  );

  // 5. Optional: Validate that each data item conforms to the summary DTO
  for (const item of searchResult.data) {
    typia.assert(item);
    TestValidator.predicate(
      `data item ${item.id} has a non-empty id`,
      typeof item.id === "string" && item.id.length > 0,
    );
    TestValidator.predicate(
      `data item ${item.id} has a non-empty name`,
      typeof item.name === "string" && item.name.length > 0,
    );
  }
}
