import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { generate_random_shopping_mall_seller_shipments_order_items_add_order_items } from "../../../generate/generate_random_shopping_mall_seller_shipments_order_items_add_order_items";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shipment_order_item } from "../../../prepare/prepare_random_shopping_mall_shipment_order_item";

export async function test_api_shipment_order_item_removal_administrator_success_and_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = {};
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);
  await authorize_administrator_login(adminConnection, { body: {} });
  // 2. Seller join and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinBody = {};
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: sellerJoinBody,
  });
  typia.assert(sellerAuth);
  await authorize_seller_login(sellerConnection, { body: {} });
  // 3. Seller creates shipment
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {},
  );
  // Since shipment type does not expose 'id', generate a random UUID for test usage
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  // 4. Seller adds order items to shipment
  // Generate random order items
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  await generate_random_shopping_mall_seller_shipments_order_items_add_order_items(
    sellerConnection,
    {
      params: { shipmentId: shipmentId },
      body: [{ order_item_id: orderItemId }],
    },
  );
  // 5. Administrator removes the order item from shipment
  await api.functional.shoppingMall.administrator.shipments.order_items.eraseOrderItem(
    adminConnection,
    {
      shipmentId: shipmentId,
      orderItemId: orderItemId,
    },
  );
  // 6. Scenario 2: Attempt to remove with non-existent shipmentId or orderItemId
  const randomShipmentId = typia.random<string & tags.Format<"uuid">>();
  const randomOrderItemId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("remove with non-existent shipmentId", async () => {
    await api.functional.shoppingMall.administrator.shipments.order_items.eraseOrderItem(
      adminConnection,
      {
        shipmentId: randomShipmentId,
        orderItemId: orderItemId,
      },
    );
  });
  await TestValidator.error(
    "remove with non-existent orderItemId",
    async () => {
      await api.functional.shoppingMall.administrator.shipments.order_items.eraseOrderItem(
        adminConnection,
        {
          shipmentId: shipmentId,
          orderItemId: randomOrderItemId,
        },
      );
    },
  );
  // 7. Scenario 3: Unauthorized attempt by non-administrator user
  await TestValidator.error("seller unauthorized remove attempt", async () => {
    await api.functional.shoppingMall.administrator.shipments.order_items.eraseOrderItem(
      sellerConnection,
      {
        shipmentId: shipmentId,
        orderItemId: orderItemId,
      },
    );
  });
}
