import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { generate_random_shopping_mall_seller_shipments_order_items_add_order_items } from "../../../generate/generate_random_shopping_mall_seller_shipments_order_items_add_order_items";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shipment_order_item } from "../../../prepare/prepare_random_shopping_mall_shipment_order_item";

export async function test_api_seller_shipments_order_items_eraseorderitem(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller owner authentication and join
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_seller_join(ownerConnection, {
    body: {},
  });
  ownerConnection.headers ??= {};
  ownerConnection.headers.Authorization = ownerAuth.token.access;
  // 2. Create a shipment by owner seller
  const shipmentRaw = await generate_random_shopping_mall_seller_shipments_create(
    ownerConnection,
    {
      body: undefined,
    },
  );
  const shipment = typia.assert<typeof shipmentRaw & { id: string }>(shipmentRaw);
  // 3. Add order item to shipment
  const shipmentOrderItemRaw =
    await generate_random_shopping_mall_seller_shipments_order_items_add_order_items(
      ownerConnection,
      {
        params: { shipmentId: shipment.id },
        body: undefined,
      },
    );
  const shipmentOrderItem = typia.assert<typeof shipmentOrderItemRaw & { id: string }>(
    shipmentOrderItemRaw,
  );
  // 4. Erase the order item from the shipment successfully
  await api.functional.shoppingMall.seller.shipments.order_items.eraseOrderItem(
    ownerConnection,
    {
      shipmentId: shipment.id,
      orderItemId: shipmentOrderItem.id,
    },
  );
  // 5. Scenario: Attempt removal with non-existent shipment
  const nonExistentShipmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "removal from non-existent shipment",
    404,
    async () => {
      await api.functional.shoppingMall.seller.shipments.order_items.eraseOrderItem(
        ownerConnection,
        {
          shipmentId: nonExistentShipmentId,
          orderItemId: shipmentOrderItem.id,
        },
      );
    },
  );
  // 6. Scenario: Attempt removal by unauthorized seller
  // 6-1. Authenticate as second seller
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  const unauthorizedAuth = await authorize_seller_join(unauthorizedConnection, {
    body: {},
  });
  unauthorizedConnection.headers ??= {};
  unauthorizedConnection.headers.Authorization = unauthorizedAuth.token.access;
  // 6-2. Attempt to delete order item added by original owner
  await TestValidator.httpError(
    "removal by unauthorized seller",
    403,
    async () => {
      await api.functional.shoppingMall.seller.shipments.order_items.eraseOrderItem(
        unauthorizedConnection,
        {
          shipmentId: shipment.id,
          orderItemId: shipmentOrderItem.id,
        },
      );
    },
  );
}
