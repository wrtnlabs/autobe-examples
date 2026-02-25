import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

/**
 * Test that a customer can successfully retrieve the shipping address snapshot
 * for their own order.
 *
 * **Setup Steps:**
 * 1. Register and authenticate as a customer via customer join endpoint
 * 2. Create an order using the customer's address (this automatically creates the address snapshot)
 *
 * **Test Execution:**
 * 1. Call GET /shoppingMall/customer/orders/{orderId}/address with the orderId from the created order
 * 2. Use the authentication token from customer join
 *
 * **Expected Results:**
 * - HTTP 200 OK response
 * - Response body contains complete IShoppingMallOrderAddress object
 * - All address fields are present: id (UUID), recipientName, phone, street, city, state, postalCode, country, createdAt
 * - Address snapshot preserves complete delivery information
 */
export async function test_api_order_address_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication - create a new customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create an order which automatically captures the shipping address snapshot
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // 3. Retrieve the shipping address snapshot for the order
  const address = await api.functional.shoppingMall.customer.orders.address.at(
    customerConnection,
    {
      orderId: order.id,
    },
  );
  typia.assert(address);
  // 4. Validate the address snapshot matches the order's address
  TestValidator.equals("address id matches", address.id, order.address.id);
  TestValidator.equals(
    "recipient name matches",
    address.recipientName,
    order.address.recipientName,
  );
  TestValidator.equals("phone matches", address.phone, order.address.phone);
  TestValidator.equals("street matches", address.street, order.address.street);
  TestValidator.equals("city matches", address.city, order.address.city);
  TestValidator.equals("state matches", address.state, order.address.state);
  TestValidator.equals(
    "postal code matches",
    address.postalCode,
    order.address.postalCode,
  );
  TestValidator.equals(
    "country matches",
    address.country,
    order.address.country,
  );
  TestValidator.equals(
    "created at matches",
    address.createdAt,
    order.address.createdAt,
  );
}
