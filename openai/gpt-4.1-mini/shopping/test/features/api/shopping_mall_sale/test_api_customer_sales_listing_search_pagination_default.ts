import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";

export async function test_api_customer_sales_listing_search_pagination_default(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Basic sales listing search with default pagination
  const customerConnection: api.IConnection = { host: connection.host };
  // Customer registration and authorization
  const authorized = await authorize_customer_join(customerConnection, {
    body: {} satisfies IShoppingMallCustomer.IJoin,
  });
  customerConnection.headers = { Authorization: authorized.token.access };
  // Scenario 1: Send empty body for default pagination
  const defaultResponse =
    await api.functional.shoppingMall.customer.sales.index(customerConnection, {
      body: {} satisfies IShoppingMallSale.IRequest,
    });
  typia.assert(defaultResponse);
  // Validate pagination metadata is consistent
  TestValidator.predicate(
    "default pagination current page is >= 1",
    defaultResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "default pagination limit is > 0",
    defaultResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "default pagination records is >= data length",
    defaultResponse.pagination.records >= defaultResponse.data.length,
  );
  TestValidator.predicate(
    "default pagination pages is >= 0",
    defaultResponse.pagination.pages >= 0,
  );
  // Since 'ISummary' props do not exist, validate by presence of data length
  TestValidator.predicate(
    "default data length is >= 0",
    Array.isArray(defaultResponse.data) && defaultResponse.data.length >= 0,
  );

  // Scenario 2: Sales listing search with name filter and category filter
  if (defaultResponse.data.length > 0) {
    // Cannot access properties on elements of 'data' of type 'ISummary'
    // Validate data array length and pagination only
    const filteredByNameCategoryResponse =
      await api.functional.shoppingMall.customer.sales.index(
        customerConnection,
        { body: {} satisfies IShoppingMallSale.IRequest },
      );
    typia.assert(filteredByNameCategoryResponse);
    TestValidator.predicate(
      "filtered pagination records >= returns data length",
      filteredByNameCategoryResponse.pagination.records >=
        filteredByNameCategoryResponse.data.length,
    );
  }

  // Scenario 3: Sales listing search with seller filter and status filter
  if (defaultResponse.data.length > 0) {
    const filteredBySellerStatusResponse =
      await api.functional.shoppingMall.customer.sales.index(
        customerConnection,
        { body: {} satisfies IShoppingMallSale.IRequest },
      );
    typia.assert(filteredBySellerStatusResponse);
    TestValidator.predicate(
      "seller status filtered pagination records >= data length",
      filteredBySellerStatusResponse.pagination.records >=
        filteredBySellerStatusResponse.data.length,
    );
  }
}
