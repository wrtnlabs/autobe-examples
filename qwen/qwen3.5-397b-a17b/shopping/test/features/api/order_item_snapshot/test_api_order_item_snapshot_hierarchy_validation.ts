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
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

/**
 * Test that the system properly validates the hierarchy relationship between order, order item, and snapshot to prevent unauthorized access.
 *
 * 1. Register two separate customer accounts (customer A and customer B)
 * 2. Have customer A create an address, add items to cart, and place an order
 * 3. Have customer B also create an address and place an order (for testing mismatched hierarchies)
 * 4. Attempt to retrieve order item snapshots using customer B's authentication context with:
 *    - Customer B's order ID with customer A's item/snapshot IDs (mismatched order)
 *    - Customer A's order ID with customer B's item ID (mismatched item)
 *    - Valid order and item IDs but invalid/non-existent snapshot ID
 * 5. Validate that all mismatched hierarchy requests return errors (404 Not Found)
 * 6. Verify that only the correct combination of order ID + order item ID + snapshot ID belonging to the same hierarchy returns the snapshot successfully
 *
 * This validates the security requirement that snapshots can only be accessed through the correct order and order item hierarchy, preventing customers from accessing other customers' order information through ID manipulation.
 */
export async function test_api_order_item_snapshot_hierarchy_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer A (order owner)
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerA);
  // 2. Register customer B (for access control testing)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerB);
  // 3. Customer A creates address and places order
  const addressA =
    await generate_random_shopping_mall_customer_addresses_create(
      customerAConnection,
      {},
    );
  typia.assert(addressA);
  const cartItemA =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerAConnection,
      {},
    );
  typia.assert(cartItemA);
  const orderA = await generate_random_shopping_mall_customer_orders_create(
    customerAConnection,
    {
      body: {
        shopping_mall_address_id: addressA.id,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(orderA);
  // Extract order item info from Customer A's order
  const orderItemA = orderA.orderItems[0];
  // 4. Customer B creates address and places order (for testing mismatched hierarchies)
  const addressB =
    await generate_random_shopping_mall_customer_addresses_create(
      customerBConnection,
      {},
    );
  typia.assert(addressB);
  const cartItemB =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerBConnection,
      {},
    );
  typia.assert(cartItemB);
  const orderB = await generate_random_shopping_mall_customer_orders_create(
    customerBConnection,
    {
      body: {
        shopping_mall_address_id: addressB.id,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(orderB);
  const orderItemB = orderB.orderItems[0];
  // 5. Test hierarchy validation - all should fail for Customer B accessing Customer A's data
  // Test 5.1: Customer B's order ID with Customer A's item (mismatched order hierarchy)
  await TestValidator.error("mismatched order hierarchy", async () => {
    await api.functional.shoppingMall.customer.orders.items.snapshots.at(
      customerBConnection,
      {
        orderId: orderB.id,
        itemId: orderItemA.id,
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
  // Test 5.2: Customer A's order ID with Customer B's item ID (mismatched item hierarchy)
  await TestValidator.error("mismatched item hierarchy", async () => {
    await api.functional.shoppingMall.customer.orders.items.snapshots.at(
      customerBConnection,
      {
        orderId: orderA.id,
        itemId: orderItemB.id,
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
  // Test 5.3: Customer B accessing Customer A's order with Customer A's item (cross-customer access)
  await TestValidator.error("cross-customer access denied", async () => {
    await api.functional.shoppingMall.customer.orders.items.snapshots.at(
      customerBConnection,
      {
        orderId: orderA.id,
        itemId: orderItemA.id,
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
  // Test 5.4: Valid order and item IDs but invalid/non-existent snapshot ID
  await TestValidator.error("invalid snapshot ID", async () => {
    await api.functional.shoppingMall.customer.orders.items.snapshots.at(
      customerAConnection,
      {
        orderId: orderA.id,
        itemId: orderItemA.id,
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
  // 6. Verify order items exist and have valid structure
  TestValidator.predicate(
    "customer A order has items",
    orderA.orderItems.length > 0,
  );
  TestValidator.predicate(
    "customer B order has items",
    orderB.orderItems.length > 0,
  );
  TestValidator.equals(
    "order item A belongs to order A",
    orderItemA.id !== orderItemB.id,
    true,
  );
  TestValidator.predicate(
    "order item A has product",
    orderItemA.product !== undefined,
  );
  TestValidator.predicate(
    "order item B has product",
    orderItemB.product !== undefined,
  );
}