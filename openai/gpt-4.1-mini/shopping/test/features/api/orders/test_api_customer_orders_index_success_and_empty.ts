import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_orders_index_success_and_empty(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Customer joins and retrieves paid orders list successfully
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {},
  });
  customerConnection.headers ??= {};
  customerConnection.headers.Authorization = authorized.token.access;
  // Pagination parameters
  const page = 1 satisfies number & tags.Type<"int32"> & tags.Minimum<0>;
  const limit = 10 satisfies number & tags.Type<"int32"> & tags.Minimum<0>;
  // Filter: order_status = 'paid'
  const order_status = "paid" as const;
  // Request to get orders with filter order_status
  const output1 = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: { order_status, page, limit },
    },
  );
  typia.assert(output1);
  // Validate pagination metadata
  TestValidator.predicate("current page >= 1", output1.pagination.current >= 1);
  TestValidator.predicate("pages >= 0", output1.pagination.pages >= 0);
  TestValidator.predicate("records >= 0", output1.pagination.records >= 0);
  TestValidator.predicate("limit > 0", output1.pagination.limit > 0);
  // Validate data array type and consistency
  TestValidator.predicate("data is array", Array.isArray(output1.data));
  // Validate each order summary using typia.assert only (no property assumptions)
  for (const order of output1.data) {
    typia.assert(order);
  }
  // Scenario 2: Customer queries non-existing order_number to get empty results
  const impossibleOrderNumber = "not_found_order_number_12345";
  const output2 = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: { order_number: impossibleOrderNumber, page, limit },
    },
  );
  typia.assert(output2);
  // Validate empty data and pagination info
  TestValidator.equals("empty data array", output2.data.length, 0);
  TestValidator.equals("page number is 1", output2.pagination.current, 1);
  TestValidator.equals("zero records", output2.pagination.records, 0);
  TestValidator.equals("zero pages", output2.pagination.pages, 0);
}
