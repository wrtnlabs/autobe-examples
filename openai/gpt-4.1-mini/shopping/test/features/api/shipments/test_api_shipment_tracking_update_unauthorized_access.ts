import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTracking";
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
import { generate_random_shopping_mall_seller_shipments_trackings_create_tracking } from "../../../generate/generate_random_shopping_mall_seller_shipments_trackings_create_tracking";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shipment_tracking } from "../../../prepare/prepare_random_shopping_mall_shipment_tracking";

export async function test_api_shipment_tracking_update_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // This test scenario verifies that updating shipment tracking fails with proper error handling when the shipment does not belong to the administrator's seller account, simulating an unauthorized access attempt.
  // Create seller connection and register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(sellerAuth);
  // Seller creates a shipment
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(shipment);
  // Extract shipment id correctly
  const shipmentId: string = (shipment as any).id || (shipment as any)._id || "";
  if (!shipmentId) throw new Error("shipment id not found");

  // Seller creates a shipment tracking record
  const tracking =
    await generate_random_shopping_mall_seller_shipments_trackings_create_tracking(
      sellerConnection,
      {
        params: { shipmentId: shipmentId },
        body: {},
      },
    );
  typia.assert(tracking);
  // Extract tracking id correctly
  const trackingId: string = (tracking as any).id || (tracking as any)._id || "";
  if (!trackingId) throw new Error("tracking id not found");

  // Create administrator connection and join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuth);
  // Prepare valid update body to test permission enforcement
  const updateBody: IShoppingMallShipmentTracking.IUpdate =
    typia.random<IShoppingMallShipmentTracking.IUpdate>();
  // Attempt update tracking as administrator to a shipment they do not own and expect an error
  await TestValidator.httpError(
    "administrator unauthorized shipment tracking update",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.administrator.shipments.trackings.updateTracking(
        adminConnection,
        {
          shipmentId: shipmentId,
          trackingId: trackingId,
          body: updateBody,
        },
      );
    },
  );
}
