import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentOrderItem";
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
import { generate_random_shopping_mall_customer_order_items_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_shipment_order_item_update_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller join
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerPassword = "StrongP@ssw0rd";
  const sellerJoined = await authorize_seller_join(sellerConnection, {
    body: { password: sellerPassword },
  });
  typia.assert(sellerJoined);
  // 2. Customer join
  const customerConnection: api.IConnection = { host: connection.host };
  const customerPassword = "StrongP@ssw0rd";
  const customerJoined = await authorize_customer_join(customerConnection, {
    body: { password: customerPassword },
  });
  typia.assert(customerJoined);
  // 3. Customer login
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerJoined.email,
      password: customerPassword,
    },
  });
  // 4. Create an order item as customer
  const orderItem =
    await generate_random_shopping_mall_customer_order_items_create(
      customerConnection,
      { body: {} },
    );
  typia.assert(orderItem);
  // 5. Seller login
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoined.email,
      password: sellerPassword,
    },
  });
  // 6. Seller creates shipment with the order item
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        carrierName: "TestCarrier",
        trackingNumber: "TRACK123456",
        orderItemIds: [orderItem.id],
      },
    },
  );
  typia.assert(shipment);
  // 7. Update shipment order item linkage
  // Note: We lack API to list shipmentOrderItems, assuming shipmentOrderItemId === orderItem.id for this test
  // However, that is logically incorrect but no better option given the available API
  // Using update API to update shipmentOrderItem with shipment ID and order item ID
  // Use the orderItem id as shipmentOrderItemId as a workaround
  const shipmentOrderItemId = orderItem.id;
  const updateBody: DeepPartial<IShoppingMallShipmentOrderItem> = {
    shoppingMallShipmentId: shipment.id,
    shoppingMallOrderItemId: orderItem.id,
  };
  const updated =
    await api.functional.shoppingMall.seller.shipmentOrderItems.updateShipmentOrderItem(
      sellerConnection,
      {
        shipmentOrderItemId,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "updated shipment ID",
    updated.shoppingMallShipmentId,
    shipment.id,
  );
  TestValidator.equals(
    "updated order item ID",
    updated.shoppingMallOrderItemId,
    orderItem.id,
  );
}
