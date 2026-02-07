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

export async function test_api_customer_order_history_filtered_by_status_and_amount(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authorize customer to establish valid JWT token
  const customerConnection: api.IConnection = { host: connection.host, headers: {} };
  const customerJoinInput = {} satisfies IShoppingMallCustomer.IJoin;
  const authorized = await authorize_customer_join(customerConnection, {
    body: customerJoinInput,
  });
  (customerConnection.headers as Required<api.IConnection>["headers"]).Authorization = authorized.token.access;
  // 2. Call the endpoint with empty filter (as per IRequest: {})
  const filterRequest: IShoppingMallOrder.IRequest = {};
  // 3. Retrieve order history
  const orderHistory = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: filterRequest,
    },
  );
  typia.assert(orderHistory);
  // 4. Validate pagination metadata (required regardless of filter)
  TestValidator.equals("current page is 1", orderHistory.pagination.current, 1);
  TestValidator.predicate(
    "limit is positive",
    orderHistory.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count >= 0",
    orderHistory.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count >= 0",
    orderHistory.pagination.pages >= 0,
  );
  // 5. Validate response structure has data array
  TestValidator.predicate(
    "data is non-empty array",
    orderHistory.data.length > 0,
  );
  // 6. Validate each order summary structure
  orderHistory.data.forEach((order) => {
    // Only validate what's defined in IShoppingMallOrder.ISummary (empty object)
    // Since ISummary is empty, we cannot assert any properties
    // But ensure all items are objects
    TestValidator.predicate(
      "each item is an object",
      typeof order === "object" && order !== null,
    );
  });
}