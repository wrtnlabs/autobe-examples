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

/**
 * Test filtering customer order history by order status.
 *
 * Verifies that an authenticated customer can filter their order history by
 * status. The test registers a new customer, then queries the order list
 * endpoint with the status filter set to "paid". All returned orders must
 * have exactly the "paid" status, and the pagination metadata must accurately
 * reflect the filtered result count.
 *
 * 1. Customer registers and authenticates via authorize_customer_join.
 * 2. Customer queries orders with the status filter set to "paid".
 * 3. Validates the response structure via typia.assert.
 * 4. Validates every returned order has the "paid" status.
 * 5. Validates pagination records count matches the actual data length.
 */
export async function test_api_order_list_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Query orders filtered by "paid" status
  const result = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        status: "paid",
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(result);
  // 3. Validate all returned orders have "paid" status
  TestValidator.predicate(
    "all orders should have paid status",
    result.data.every((order) => order.status === "paid"),
  );
  // 4. Validate pagination metadata matches actual data
  TestValidator.predicate(
    "pagination records count matches data length",
    result.pagination.records === result.data.length,
  );
}
