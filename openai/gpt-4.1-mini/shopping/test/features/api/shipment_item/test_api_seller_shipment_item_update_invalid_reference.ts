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

export async function test_api_seller_shipment_item_update_invalid_reference(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Validate that updating shipment item with non-existent shipmentId or orderItemId fails with error.
  // 1. Seller registration and login
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoinPassword = typia.random<string>();
  const sellerAuthorized = await authorize_seller_join(
    sellerJoinConnection,
    { body: { password: sellerJoinPassword } },
  );
  typia.assert(sellerAuthorized);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: { email: sellerAuthorized.email, password: sellerJoinPassword },
  });

  // 2. Customer join and login to create an order
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerJoinPassword = typia.random<string>();
  const customerAuthorized = await authorize_customer_join(
    customerJoinConnection,
    { body: { password: customerJoinPassword } },
  );
  typia.assert(customerAuthorized);
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: { email: customerAuthorized.email, password: customerJoinPassword },
  });

  // 3. Customer creates an order
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerLoginConnection,
    {},
  );
  typia.assert(order);

  // 4. Seller creates a shipment for the order items
  const orderItemIds = order.orderItems.map((item) => item.id);
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerLoginConnection,
    {
      body: {
        carrierName: RandomGenerator.name(1),
        trackingNumber: RandomGenerator.alphaNumeric(12),
        orderItemIds,
      },
    },
  );
  typia.assert(shipment);

  // 5. Attempt updating shipment item with invalid shipmentId (non-existent UUID)
  const invalidShipmentId = typia.random<string & tags.Format<"uuid">>();
  const invalidOrderItemId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "update shipment item fails with invalid shipmentId",
    async () => {
      await api.functional.shoppingMall.seller.shipment_items.update(
        sellerLoginConnection,
        {
          shipmentItemId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            shipmentId: invalidShipmentId,
          },
        },
      );
    },
  );

  // Using random shipmentItemId, invalid orderItemId
  await TestValidator.error(
    "update shipment item fails with invalid orderItemId",
    async () => {
      await api.functional.shoppingMall.seller.shipment_items.update(
        sellerLoginConnection,
        {
          shipmentItemId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            orderItemId: invalidOrderItemId,
          },
        },
      );
    },
  );
}
