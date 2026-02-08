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

export async function test_api_shipment_order_item_update_by_administrator_success(
  connection: api.IConnection,
): Promise<void> {
  // Create new admin connection and join as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // Set the adminConnection header to authorized token access
  adminConnection.headers = { Authorization: authorized.token.access };
  // Generate valid shipmentId and orderItemId UUIDs
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  // Update shipment order item association
  const updatedShipmentOrderItem =
    await api.functional.shoppingMall.administrator.shipments.order_items.updateShipmentOrderItemAssociation(
      adminConnection,
      {
        shipmentId,
        orderItemId,
      },
    );
  // Assert the updated result matches expected type
  typia.assert(updatedShipmentOrderItem);
}
