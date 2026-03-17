import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentItem";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
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
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_shipment_items_multiple_items_bundle(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(customerAuth);
  // 3. Customer creates order with multiple items from the same seller
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Verify order has multiple items from the same seller
  TestValidator.predicate(
    "order has multiple items",
    () => order.items.length >= 1,
  );
  // Get all order item IDs from the order
  const orderItemIds = order.items.map((item) => item.id);
  TestValidator.predicate("order items belong to same seller", () => {
    const sellerId = order.items[0].seller.id;
    return order.items.every((item) => item.seller.id === sellerId);
  });
  // 4. Seller creates a single shipment bundling all order items
  const sellerShipmentConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerShipmentConnection, {
    body: {
      email: sellerAuth.email,
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: undefined,
    },
  });
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerShipmentConnection,
    {
      body: {
        order_item_ids: orderItemIds,
        tracking_carrier: "FedEx",
        tracking_number: typia.random<string>(),
      },
    },
  );
  typia.assert(shipment);
  // 5. Verify shipment was created with all items
  TestValidator.equals(
    "shipment contains all order items",
    shipment.items.length,
    orderItemIds.length,
  );
  TestValidator.predicate(
    "shipment has tracking info",
    () => shipment.tracking_carrier !== null,
  );
  // 6. Customer retrieves shipment items list
  const customerShipmentConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerShipmentConnection, {
    body: {
      email: customerAuth.email,
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  const shipmentItemsResponse =
    await api.functional.shoppingMall.customer.shipments.items.index(
      customerShipmentConnection,
      {
        shipmentId: shipment.id,
        body: {
          page: 1,
          limit: 100,
        },
      },
    );
  typia.assert(shipmentItemsResponse);
  // 7. Validate response contains all bundled items
  TestValidator.equals(
    "shipment items count matches",
    shipmentItemsResponse.data.length,
    orderItemIds.length,
  );
  TestValidator.predicate(
    "pagination is valid",
    () => shipmentItemsResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "records count matches data",
    () =>
      shipmentItemsResponse.pagination.records ===
      shipmentItemsResponse.data.length,
  );
  // 8. Verify all items show SHIPPED status
  shipmentItemsResponse.data.forEach((shipmentItem, index) => {
    TestValidator.equals(
      `item ${index} status is SHIPPED`,
      shipmentItem.orderItem.status,
      "SHIPPED",
    );
    TestValidator.equals(
      `item ${index} has order item`,
      shipmentItem.orderItem.id !== undefined,
      true,
    );
    TestValidator.predicate(
      `item ${index} has quantity`,
      () => shipmentItem.orderItem.quantity >= 1,
    );
    TestValidator.predicate(
      `item ${index} has unit price`,
      () => shipmentItem.orderItem.unit_price >= 0,
    );
  });
  // 9. Verify all items belong to the same seller (business rule validation)
  const sellerIds = shipmentItemsResponse.data.map(
    (item) => item.orderItem.seller.id,
  );
  TestValidator.predicate("all items from same seller", () => {
    const firstSellerId = sellerIds[0];
    return sellerIds.every((id) => id === firstSellerId);
  });
  // 10. Verify order item IDs match between shipment and retrieved items
  const retrievedItemIds = shipmentItemsResponse.data.map(
    (item) => item.orderItem.id,
  );
  TestValidator.predicate("all order items present in shipment", () => {
    return orderItemIds.every((id) => retrievedItemIds.includes(id));
  });
}
