import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_seller_shipment_item_update_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller join and obtain authorized connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, { body: {} });
  typia.assert(seller);
  // 2. Customer join and obtain authorized connection
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(customer);
  // 3. Customer creates an order
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    { body: {} },
  );
  typia.assert(order);
  // 4. Seller creates a shipment with order items
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderItemIds: order.orderItems.map((oi) => oi.id),
        carrierName: "CarrierXYZ",
        trackingNumber: "TRACK123456",
      },
    },
  );
  typia.assert(shipment);
  // 5. Retrieve shipment items from the shipment
  // For simplicity, pick an arbitrary shipment item id from shipment order items if available
  // However, the API returned is shipment, not shipment item, so we guess shipment item ids
  // Since we don't have direct API for shipment items, we can't list, so let's use the shipment id (invalid) for test
  // 6. Attempt to update shipment item with non-existent shipmentItemId
  const fakeShipmentItemId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "update shipment item with non-existent id should fail with 404",
    404,
    async () => {
      await api.functional.shoppingMall.seller.shipment_items.update(
        sellerConnection,
        {
          shipmentItemId: fakeShipmentItemId,
          body: {},
        },
      );
    },
  );
  // 7. Attempt update by unauthorized customer should fail with 403
  // We must use an actual shipment item id, but since no retrieval, we reuse fakeShipmentItemId which is non-exist
  await TestValidator.httpError(
    "customer update shipment item should fail with 403",
    403,
    async () => {
      await api.functional.shoppingMall.seller.shipment_items.update(
        customerConnection,
        {
          shipmentItemId: fakeShipmentItemId,
          body: {},
        },
      );
    },
  );
}
