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

export async function test_api_shipment_tracking_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - join and login
  const sellerJoin = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(sellerJoin);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoin.email,
      password: "Test1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 2. Customer setup - join and login to place order
  const customerJoin = await authorize_customer_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerJoin);
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerJoin.email,
      password: "Test1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // 3. Customer places order (this creates order items for the seller)
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {},
    },
  );
  typia.assert(order);
  // 4. Create shipment with order items from the order we just placed
  // Extract order item IDs from the order
  const orderItemIds = order.items.map((item) => item.id);
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        order_item_ids: orderItemIds,
        tracking_carrier: "FedEx",
        tracking_number: `TRACK${RandomGenerator.alphaNumeric(10)}`,
      },
    },
  );
  typia.assert(shipment);
  // Store original timestamps for comparison
  const originalUpdatedAt = shipment.updated_at;
  const originalShippedAt = shipment.shipped_at;
  // 5. Update shipment tracking information with new values
  const newTrackingCarrier = "DHL Express";
  const newTrackingNumber = `TRACK${RandomGenerator.alphaNumeric(12)}`;
  const updatedShipment =
    await api.functional.shoppingMall.seller.shipments.update(
      sellerConnection,
      {
        shipmentId: shipment.id,
        body: {
          trackingCarrier: newTrackingCarrier,
          trackingNumber: newTrackingNumber,
        } satisfies IShoppingMallShipment.IUpdate,
      },
    );
  typia.assert(updatedShipment);
  // 6. Validate updated shipment contains correct tracking information
  TestValidator.equals(
    "shipment ID unchanged",
    updatedShipment.id,
    shipment.id,
  );
  TestValidator.equals(
    "tracking carrier updated",
    updatedShipment.tracking_carrier,
    newTrackingCarrier,
  );
  TestValidator.equals(
    "tracking number updated",
    updatedShipment.tracking_number,
    newTrackingNumber,
  );
  TestValidator.equals(
    "order reference preserved",
    updatedShipment.order.id,
    order.id,
  );
  TestValidator.predicate(
    "items array exists",
    Array.isArray(updatedShipment.items),
  );
  TestValidator.predicate(
    "items array not empty",
    updatedShipment.items.length > 0,
  );
  // Verify timestamps - updated_at should change, shipped_at should remain same
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedShipment.updated_at,
    originalUpdatedAt,
  );
  TestValidator.equals(
    "shipped_at timestamp unchanged",
    updatedShipment.shipped_at,
    originalShippedAt,
  );
}
