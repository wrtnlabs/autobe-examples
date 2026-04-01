import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_order_items_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_refund_requests_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

/**
 * Test that refund requests are handled per individual order item, not per entire order.
 *
 * This test validates requirements [80] and [267] that refund requests are handled
 * per order item rather than per entire order.
 *
 * Setup:
 * 1. Register a new customer account
 * 2. Create a shipping address for the customer
 * 3. Add multiple product variants to cart (at least 2 different items)
 * 4. Create an order with multiple order items
 *
 * Test Execution:
 * 1. Submit a refund request for the FIRST order item with a specific reason
 * 2. Verify the refund request is created successfully for item 1
 * 3. Submit a separate refund request for the SECOND order item with different reason
 * 4. Verify both refund requests exist independently with different reasons
 *
 * Validation Points:
 * - Each refund request is created with pending status for its respective item
 * - Each refund request has its own reason and timestamps
 * - Creating refund request for one item does not affect other items in the same order
 */
export async function test_api_refund_request_individual_item_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);
  // 2. Create shipping address
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {},
  );
  typia.assert(address);
  // 3. Add first product variant to cart
  const cartItem1 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem1);
  // 4. Add second product variant to cart (different variant)
  const cartItem2 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem2);
  // 5. Create order with multiple items
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shopping_mall_address_id: address.id,
      },
    },
  );
  typia.assert(order);
  // Verify order has multiple items
  TestValidator.predicate(
    "order has multiple items",
    () => order.orderItems.length >= 2,
  );
  const firstOrderItem = order.orderItems[0];
  const secondOrderItem = order.orderItems[1];
  // 6. Submit refund request for FIRST order item
  const refundRequest1 =
    await api.functional.shoppingMall.customer.order_items.refund_requests.create(
      customerConnection,
      {
        orderItemId: firstOrderItem.id,
        body: {
          reason: "First item defective - testing individual item refund",
        },
      },
    );
  typia.assert(refundRequest1);
  // 7. Verify first refund request details
  TestValidator.equals(
    "first refund request order item",
    refundRequest1.orderItem.id,
    firstOrderItem.id,
  );
  TestValidator.equals(
    "first refund request reason",
    refundRequest1.reason,
    "First item defective - testing individual item refund",
  );
  TestValidator.equals(
    "first refund request status",
    refundRequest1.status,
    "pending",
  );
  typia.assertGuard(refundRequest1.requested_at!);
  // 8. Submit refund request for SECOND order item (independent request)
  const refundRequest2 =
    await api.functional.shoppingMall.customer.order_items.refund_requests.create(
      customerConnection,
      {
        orderItemId: secondOrderItem.id,
        body: {
          reason: "Second item not as described - independent refund request",
        },
      },
    );
  typia.assert(refundRequest2);
  // 9. Verify second refund request details
  TestValidator.equals(
    "second refund request order item",
    refundRequest2.orderItem.id,
    secondOrderItem.id,
  );
  TestValidator.equals(
    "second refund request reason",
    refundRequest2.reason,
    "Second item not as described - independent refund request",
  );
  TestValidator.equals(
    "second refund request status",
    refundRequest2.status,
    "pending",
  );
  // 10. Verify refund requests are independent (different order items)
  TestValidator.notEquals(
    "refund requests are for different items",
    refundRequest1.orderItem.id,
    refundRequest2.orderItem.id,
  );
  TestValidator.notEquals(
    "refund requests have different reasons",
    refundRequest1.reason,
    refundRequest2.reason,
  );
  // 11. Verify both refund requests belong to same order but different items
  TestValidator.predicate(
    "both items from same order",
    () =>
      order.orderItems.some(
        (item) => item.id === refundRequest1.orderItem.id,
      ) &&
      order.orderItems.some((item) => item.id === refundRequest2.orderItem.id),
  );
}
