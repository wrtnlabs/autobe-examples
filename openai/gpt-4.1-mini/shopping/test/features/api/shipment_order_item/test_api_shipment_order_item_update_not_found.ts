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

export async function test_api_shipment_order_item_update_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test update shipment order item with non-existent shipmentOrderItemId to verify proper error handling as seller.
  // Authenticate with join, create customer order item and shipment, then attempt update with invalid ID.
  // Validate not found or error response indicating shipment order item does not exist.
  // 1. Seller join and login for authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerPassword = "SellerP@ssw0rd!";
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      password: sellerPassword,
      email: typia.random<string & tags.Format<"email">>(),
      shopName: RandomGenerator.name(1),
    },
  });
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoin.email,
      password: sellerPassword,
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 2. Customer join and login for order item creation
  const customerConnection: api.IConnection = { host: connection.host };
  const customerPassword = "CustomerP@ssw0rd!";
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: customerPassword,
    },
  });
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerJoin.email,
      password: customerPassword,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // 3. Create a customer order item
  const orderItem =
    await generate_random_shopping_mall_customer_order_items_create(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(orderItem);
  // 4. Create a shipment as the seller including the order item
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: { orderItemIds: [orderItem.id] },
    },
  );
  typia.assert(shipment);
  // 5. Attempt to update shipment order item with a non-existent shipmentOrderItemId
  const invalidShipmentOrderItemId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "update non-existent shipment order item should error",
    async () => {
      await api.functional.shoppingMall.seller.shipmentOrderItems.updateShipmentOrderItem(
        sellerConnection,
        {
          shipmentOrderItemId: invalidShipmentOrderItemId,
          body: {},
        },
      );
    },
  );
}
