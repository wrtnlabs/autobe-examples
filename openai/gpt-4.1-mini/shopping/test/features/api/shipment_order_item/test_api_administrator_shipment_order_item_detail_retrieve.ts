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

export async function test_api_administrator_shipment_order_item_detail_retrieve(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Retrieve detailed shipment order item information successfully
  // Scenario 2: Attempt to retrieve shipment order item info when linkage does not exist
  // Scenario 3: Attempt unauthorized access
  // 1. Administrator authorization via join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {} satisfies IShoppingMallAdministrator.IJoin,
  });
  // Use realistic UUIDs for shipmentId and orderItemId
  const validShipmentId = typia.random<string & tags.Format<"uuid">>();
  const validOrderItemId = typia.random<string & tags.Format<"uuid">>();
  // Scenario 1: Successful retrieval
  const shipmentOrderItem =
    await api.functional.shoppingMall.administrator.shipments.order_items.at(
      adminConnection,
      {
        shipmentId: validShipmentId,
        orderItemId: validOrderItemId,
      },
    );
  typia.assert(shipmentOrderItem);
  // Scenario 2: Invalid linkage returns 404
  const fakeShipmentId = typia.random<string & tags.Format<"uuid">>();
  const fakeOrderItemId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "retrieve non-linked shipment order item returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.shipments.order_items.at(
        adminConnection,
        {
          shipmentId: fakeShipmentId,
          orderItemId: fakeOrderItemId,
        },
      );
    },
  );
  // Scenario 3: Unauthorized access returns 401 or 403
  await TestValidator.httpError(
    "unauthorized retrieval returns 401 or 403",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.administrator.shipments.order_items.at(
        connection,
        {
          shipmentId: validShipmentId,
          orderItemId: validOrderItemId,
        },
      );
    },
  );
}
