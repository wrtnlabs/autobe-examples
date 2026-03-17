import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

/**
 * Test shipment delivery timestamps lifecycle.
 *
 * This test validates the complete delivery tracking system:
 * 1. Seller creates shipment → shipped_at is set
 * 2. Customer confirms delivery → delivery_confirmed_at is set, items become DELIVERED
 * 3. auto_delivered_at is calculated as shipped_at + 14 days
 * 4. Verify chronological order of timestamps
 */
export async function test_api_shipment_delivery_timestamps_lifecycle(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup customer account
  const customerAuth = await authorize_customer_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerAuth.email,
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // 2. Setup seller account
  const sellerAuth = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerAuth.email,
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: undefined,
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 3. Customer creates order (using generation utility which handles cart setup)
  const order =
    await generate_random_shopping_mall_customer_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  TestValidator.predicate("order has items", order.items.length > 0);
  // 4. Seller creates shipment for the order items
  const orderItemIds = order.items.map((item) => item.id);
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        order_item_ids: orderItemIds,
        tracking_carrier: "FedEx",
        tracking_number: typia
          .random<string & tags.Format<"uuid">>()
          .replace(/-/g, "")
          .substring(0, 12),
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 5. Validate shipped_at is set when shipment is created
  TestValidator.predicate("shipped_at is set", shipment.shipped_at !== null);
  const shippedAt = shipment.shipped_at!;
  // 6. Validate auto_delivered_at is calculated as shipped_at + 14 days
  TestValidator.predicate(
    "auto_delivered_at is set",
    shipment.auto_delivered_at !== null,
  );
  const autoDeliveredAt = new Date(shipment.auto_delivered_at!);
  const shippedAtDate = new Date(shippedAt);
  const expectedAutoDelivered = new Date(
    shippedAtDate.getTime() + 14 * 24 * 60 * 60 * 1000,
  );
  // Allow 1 second tolerance for timing differences
  TestValidator.predicate(
    "auto_delivered_at equals shipped_at + 14 days",
    Math.abs(autoDeliveredAt.getTime() - expectedAutoDelivered.getTime()) <
      2000,
  );
  // 7. Customer confirms delivery
  const confirmedShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // 8. Validate delivery_confirmed_at is set after confirmation
  TestValidator.predicate(
    "delivery_confirmed_at is set",
    confirmedShipment.delivery_confirmed_at !== null,
  );
  const deliveryConfirmedAt = new Date(
    confirmedShipment.delivery_confirmed_at!,
  );
  // 9. Validate delivered_at is set after confirmation
  TestValidator.predicate(
    "delivered_at is set",
    confirmedShipment.delivered_at !== null,
  );
  const deliveredAt = new Date(confirmedShipment.delivered_at!);
  // 10. Validate chronological order: shipped_at <= delivered_at <= delivery_confirmed_at
  TestValidator.predicate(
    "shipped_at <= delivered_at",
    shippedAtDate.getTime() <= deliveredAt.getTime(),
  );
  TestValidator.predicate(
    "delivered_at <= delivery_confirmed_at",
    deliveredAt.getTime() <= deliveryConfirmedAt.getTime(),
  );
  // 11. Validate all items in shipment are now DELIVERED
  TestValidator.predicate(
    "all items are DELIVERED",
    confirmedShipment.items.every((item) => item.status === "DELIVERED"),
  );
  // 12. Get shipment details to verify final state
  const finalShipment = await api.functional.shoppingMall.customer.shipments.at(
    customerConnection,
    {
      shipmentId: shipment.id,
    },
  );
  typia.assert(finalShipment);
  // 13. Verify all timestamps are preserved
  TestValidator.equals(
    "shipped_at preserved",
    finalShipment.shipped_at,
    confirmedShipment.shipped_at,
  );
  TestValidator.equals(
    "delivered_at preserved",
    finalShipment.delivered_at,
    confirmedShipment.delivered_at,
  );
  TestValidator.equals(
    "delivery_confirmed_at preserved",
    finalShipment.delivery_confirmed_at,
    confirmedShipment.delivery_confirmed_at,
  );
  TestValidator.equals(
    "auto_delivered_at preserved",
    finalShipment.auto_delivered_at,
    confirmedShipment.auto_delivered_at,
  );
}