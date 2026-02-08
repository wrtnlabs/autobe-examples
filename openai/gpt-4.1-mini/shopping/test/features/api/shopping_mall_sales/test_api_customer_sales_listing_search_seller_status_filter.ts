import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSale";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sales_listing_search_seller_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Sales listing search with empty and filtered requests, validating result consistency and edge behavior without invalid property access.
  // Step 1: Register a new customer and authorize
  const customerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_customer_join(customerConnection, {
    body: {},
  });
  customerConnection.headers = { Authorization: joined.token.access };
  // Step 2: Query sales listing without filters
  const fullResponse = await api.functional.shoppingMall.customer.sales.index(
    customerConnection,
    {
      body: {},
    },
  );
  typia.assert(fullResponse);
  // Validate non-null page info
  TestValidator.predicate(
    "pagination current positive",
    fullResponse.pagination.current > 0,
  );
  // Validate data is an array
  TestValidator.predicate(
    "sales data is array",
    Array.isArray(fullResponse.data),
  );
  // Step 3: Query sales with filter by a non-existent seller_id (simulate empty results)
  // Using a fixed UUID unlikely to exist
  const nonExistSellerId = "00000000-0000-0000-0000-000000000000";
  const filteredResponse =
    await api.functional.shoppingMall.customer.sales.index(customerConnection, {
      body: {
        seller_id: nonExistSellerId,
        status: "approved",
      },
    });
  typia.assert(filteredResponse);
  // Validate empty results
  TestValidator.equals(
    "empty results for non-existent seller",
    filteredResponse.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records for empty result",
    filteredResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages for empty result",
    filteredResponse.pagination.pages,
    0,
  );
}
