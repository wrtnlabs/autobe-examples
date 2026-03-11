import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_details_success(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated customer connection
  const customerConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // Create an order using customer account
  const order =
    await api.functional.ecommerceMall.customer.orders.create(
      customerConnection,
    );
  typia.assert(order);
  // Retrieve order details
  const fetchedOrder = await api.functional.ecommerceMall.customer.orders.at(
    customerConnection,
    {
      orderId: order.id,
    },
  );
  typia.assert(fetchedOrder);
  // Validate order details
  TestValidator.equals("order ID matches", fetchedOrder.id, order.id);
  TestValidator.equals(
    "total price matches",
    fetchedOrder.total_price,
    order.total_price,
  );
  TestValidator.equals(
    "order status matches",
    fetchedOrder.order_status,
    order.order_status,
  );
  TestValidator.equals(
    "customer matches",
    fetchedOrder.customer.id,
    order.customer.id,
  );
  TestValidator.equals(
    "shipping address matches",
    fetchedOrder.shippingAddress.id,
    order.shippingAddress.id,
  );
  TestValidator.equals(
    "order items count matches",
    fetchedOrder.order_items.length,
    order.order_items.length,
  );
  // Validate order items
  fetchedOrder.order_items.forEach((item, index) => {
    const originalItem = order.order_items[index];
    TestValidator.equals("order item ID matches", item.id, originalItem.id);
    TestValidator.equals(
      "order item quantity matches",
      item.quantity,
      originalItem.quantity,
    );
    TestValidator.equals(
      "product name matches",
      item.product_name,
      originalItem.product_name,
    );
    TestValidator.equals(
      "variant options match",
      item.variant_options,
      originalItem.variant_options,
    );
    TestValidator.equals(
      "product price matches",
      item.product_price,
      originalItem.product_price,
    );
    TestValidator.equals(
      "item status matches",
      item.item_status,
      originalItem.item_status,
    );
  });
}