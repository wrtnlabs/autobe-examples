import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallShipmentOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_shipment_order_item_update_move_and_confirm_edge_case(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IShoppingMallAdministrator.IJoin = typia.random<IShoppingMallAdministrator.IJoin>();
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);
  // Setup admin connection headers with authorization token
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = adminAuth.token.access;
  // 2. Prepare UUIDs for shipmentId and orderItemId to simulate move and confirm cases
  const shipmentIdOriginal = typia.random<string & tags.Format<"uuid">>();
  const shipmentIdNew = typia.random<string & tags.Format<"uuid">>();
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  // 3. Register the order item to original shipment
  const updateOriginal =
    await api.functional.shoppingMall.administrator.shipments.order_items.updateShipmentOrderItemAssociation(
      adminConnection,
      {
        shipmentId: shipmentIdOriginal,
        orderItemId: orderItemId,
      },
    );
  typia.assert(updateOriginal);
  // 4. Move the order item from original to new shipment
  const updateMoved =
    await api.functional.shoppingMall.administrator.shipments.order_items.updateShipmentOrderItemAssociation(
      adminConnection,
      {
        shipmentId: shipmentIdNew,
        orderItemId: orderItemId,
      },
    );
  typia.assert(updateMoved);
  // 5. Confirm inclusion of order item in new shipment by updating with same shipmentId
  const updateConfirm =
    await api.functional.shoppingMall.administrator.shipments.order_items.updateShipmentOrderItemAssociation(
      adminConnection,
      {
        shipmentId: shipmentIdNew,
        orderItemId: orderItemId,
      },
    );
  typia.assert(updateConfirm);
}
