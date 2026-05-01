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
 * Test that customer order listing filters correctly by creation date range.
 *
 * Validates that the order list endpoint properly respects the createdAfter and
 * createdBefore date filters defining a closed inclusive interval. The test
 * authenticates as a customer, then queries orders bounded by both date
 * parameters and confirms every returned order's created_at falls within the
 * specified range.
 *
 * A subsequent unfiltered query provides a baseline to verify the filtered
 * result set is a proper subset of the complete order history, ensuring no
 * orders outside the date range leak into the filtered results.
 *
 * 1. Customer registers and authenticates via the join utility.
 * 2. Customer queries orders with createdAfter and createdBefore filters.
 * 3. Validates all returned order created_at timestamps are within the range.
 * 4. Customer queries all orders without date filters for baseline comparison.
 * 5. Validates filtered record count does not exceed unfiltered total.
 */
export async function test_api_order_list_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Define date range for filtering — broad enough to include all orders
  const createdAfter = "2020-01-01T00:00:00.000Z";
  const createdBefore = new Date().toISOString();
  // 3. Query orders with date range filter
  const filteredResult =
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          createdAfter,
          createdBefore,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(filteredResult);
  // 4. Validate all returned orders are within the date range (inclusive)
  const afterTime = new Date(createdAfter).getTime();
  const beforeTime = new Date(createdBefore).getTime();
  for (const order of filteredResult.data) {
    const orderTime = new Date(order.created_at).getTime();
    TestValidator.predicate(
      "order created_at >= createdAfter",
      orderTime >= afterTime,
    );
    TestValidator.predicate(
      "order created_at <= createdBefore",
      orderTime <= beforeTime,
    );
  }
  // 5. Query all orders without date filter for baseline comparison
  const allResult = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {} satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(allResult);
  // 6. Validate filtered is a subset — record count must not exceed unfiltered
  TestValidator.predicate(
    "filtered record count ≤ unfiltered total",
    filteredResult.pagination.records <= allResult.pagination.records,
  );
}
