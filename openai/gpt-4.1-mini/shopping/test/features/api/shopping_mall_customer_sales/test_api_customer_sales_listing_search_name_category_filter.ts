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

/**
 * Scenario 2: Sales listing search filtered by name and category.
 *
 * The test signs up a new customer for authentication,
 * performs a sales search with an empty body since no request properties are defined,
 * then validates the pagination metadata returned.
 */
export async function test_api_customer_sales_listing_search_name_category_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration for authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const joinBody = typia.random<IShoppingMallCustomer.IJoin>();
  const authorized = await authorize_customer_join(customerConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  customerConnection.headers ??= {};
  customerConnection.headers.Authorization = authorized.token.access;
  // 2. Call sales listing search endpoint with empty request body
  const output = await api.functional.shoppingMall.customer.sales.index(
    customerConnection,
    {
      body: {},
    },
  );
  typia.assert(output);
  // 3. Validate pagination properties
  const pagination = output.pagination;
  TestValidator.predicate(
    "pagination current is positive",
    pagination.current > 0,
  );
  TestValidator.predicate("pagination limit is positive", pagination.limit > 0);
  TestValidator.predicate(
    "pagination records not negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages not negative",
    pagination.pages >= 0,
  );
}
