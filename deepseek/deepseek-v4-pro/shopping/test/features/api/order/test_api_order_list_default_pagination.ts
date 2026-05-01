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
 * Test that an authenticated customer can browse order history with default pagination.
 *
 * Verifies the order listing endpoint returns correctly structured pagination metadata and
 * properly scoped results when called without any explicit filter or pagination parameters.
 * The test registers a new customer and calls the order listing endpoint with an empty
 * request body, triggering the server's default pagination behavior (page 1, limit 20,
 * sorted by created_at descending).
 *
 * Empty results for a new customer is a valid and expected outcome; the test focuses on
 * structural validation of pagination metadata and the customer-scoping guarantee rather
 * than requiring pre-existing order data.
 *
 * 1. Customer registers via the join endpoint and obtains an authenticated session.
 * 2. Customer calls the orders list endpoint with an empty IShoppingMallOrder.IRequest.
 * 3. Validates pagination metadata: current page defaults to 1, limit defaults to 20,
 *    records and pages reflect the actual data count.
 * 4. Validates every returned order belongs exclusively to the authenticated customer.
 */
export async function test_api_order_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  // 2. Call orders list with default pagination (empty body)
  const result = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    { body: {} satisfies IShoppingMallOrder.IRequest },
  );
  typia.assert(result);
  // 3. Validate pagination metadata
  TestValidator.equals("default current page", result.pagination.current, 1);
  TestValidator.equals("default limit", result.pagination.limit, 20);
  TestValidator.predicate(
    "records non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages matches ceil(records / limit)",
    result.pagination.pages ===
      Math.ceil(result.pagination.records / result.pagination.limit),
  );
  // 4. Validate all orders belong exclusively to the authenticated customer
  for (const order of result.data) {
    TestValidator.equals(
      "order belongs to authenticated customer",
      order.customer.id,
      customer.id,
    );
  }
}
