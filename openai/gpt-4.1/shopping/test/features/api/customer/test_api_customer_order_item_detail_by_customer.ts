import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate customer can fetch an order item detail with valid auth.
 *
 * 1. Register (join) as a new customer
 * 2. Call GET /shoppingMall/customer/orders/{orderNumber}/items/{orderItemId}
 *    using random IDs (no order creation possible)
 * 3. Validate result is IShoppingMallOrderItem (type/passive)
 *
 * Limitations: No way to guarantee a real order exists—this tests only the
 * authentication/typia/type conformance path, not true data linkage
 */
export async function test_api_customer_order_item_detail_by_customer(
  connection: api.IConnection,
) {
  // 1. Join as a new customer, which will establish access token
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;
  const customer = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(customer);

  // 2. Query for an order item by random orderNumber and orderItemId UUID
  const orderNumber = RandomGenerator.alphaNumeric(12);
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const orderItem = await api.functional.shoppingMall.customer.orders.items.at(
    connection,
    { orderNumber, orderItemId },
  );
  typia.assert(orderItem);

  // 3. Validate every required field is present via typia.assert, and type only
  // No business-logic validation due to lack of order/item creation API access
}
