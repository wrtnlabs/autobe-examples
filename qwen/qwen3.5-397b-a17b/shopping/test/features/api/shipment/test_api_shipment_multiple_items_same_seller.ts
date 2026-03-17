import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that a customer can retrieve shipment tracking information for a shipment
 * containing multiple order items from the same seller. This validates the business
 * rule that different sellers ship separately but a single seller can bundle multiple
 * items into one shipment. The test verifies: (1) Multiple order items from the same
 * seller are included in the shipment response items array. (2) All items in the
 * shipment share the same tracking information (carrier name and tracking number).
 * (3) Each item maintains its individual status, quantity, and unit price. (4) Each
 * item includes its own product snapshot and product variant snapshot preserving the
 * state at order time. (5) The shipment correctly links all items to the same order.
 */
export async function test_api_shipment_multiple_items_same_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(customerAuth);
  // 2. Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 3. Customer adds first product variant to cart
  const cartItem1 =
    await generate_random_shopping_mall_customer_customers_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem1);
  // 4. Customer adds second product variant to cart
  const cartItem2 =
    await generate_random_shopping_mall_customer_customers_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem2);
  // 5. Customer creates order from cart
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Verify order has multiple items
  TestValidator.predicate(
    "order has multiple items",
    () => order.items.length >= 2,
  );
  // 6. Seller creates shipment with multiple order items
  const orderItemIds = order.items.map((item) => item.id);
  const shipment = await api.functional.shoppingMall.seller.shipments.create(
    sellerConnection,
    {
      body: {
        order_item_ids: orderItemIds,
        tracking_carrier: "FedEx",
        tracking_number: RandomGenerator.alphaNumeric(12),
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 7. Customer retrieves shipment details
  const shipmentDetails =
    await api.functional.shoppingMall.customer.shipments.at(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(shipmentDetails);
  // 8. Validate shipment contains multiple items
  TestValidator.predicate(
    "shipment has multiple items",
    () => shipmentDetails.items.length >= 2,
  );
  // 9. Verify all items share same tracking information
  TestValidator.equals(
    "tracking carrier matches",
    shipmentDetails.tracking_carrier,
    "FedEx",
  );
  TestValidator.predicate(
    "tracking number exists",
    () => shipmentDetails.tracking_number !== null,
  );
  // 10. Verify all items are from the same seller
  const sellerIds = shipmentDetails.items.map((item) => item.seller.id);
  TestValidator.predicate("all items from same seller", () =>
    sellerIds.every((id) => id === sellerIds[0]),
  );
  // 11. Verify all items belong to the same order
  const orderIds = shipmentDetails.items.map((item) => item.order.id);
  TestValidator.predicate("all items from same order", () =>
    orderIds.every((id) => id === orderIds[0]),
  );
  // 12. Verify each item has required snapshots and properties
  for (const item of shipmentDetails.items) {
    TestValidator.predicate(
      "item has product snapshot",
      () => item.productSnapshot !== undefined,
    );
    TestValidator.predicate(
      "item has variant snapshot",
      () => item.productVariantSnapshot !== undefined,
    );
    TestValidator.predicate(
      "item has valid quantity",
      () => item.quantity >= 1,
    );
    TestValidator.predicate(
      "item has valid unit price",
      () => item.unit_price >= 0,
    );
    TestValidator.predicate("item has valid status", () =>
      ["PAID", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"].includes(
        item.status,
      ),
    );
  }
}
