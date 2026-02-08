import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTracking";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { generate_random_shopping_mall_seller_shipments_trackings_create_tracking } from "../../../generate/generate_random_shopping_mall_seller_shipments_trackings_create_tracking";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shipment_tracking } from "../../../prepare/prepare_random_shopping_mall_shipment_tracking";

export async function test_api_seller_shipment_tracking_deletion_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authenticates by joining the platform.
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerJoinConnection, {
    body: typia.random<Parameters<typeof authorize_seller_join>[1]["body"]>(),
  });
  typia.assert(authorizedSeller);
  // Prepare seller connection with authorization token
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: `Bearer ${authorizedSeller.token.access}`,
  };
  // 2. Seller creates a shipment.
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(shipment);
  // Get shipmentId from the shipment object if exists
  const shipmentId: string | undefined = (shipment as any).id;
  if (!shipmentId)
    throw new Error("Shipment ID is missing from created shipment.");
  // 3. Seller adds a shipment tracking record to that shipment.
  const shipmentTracking =
    await generate_random_shopping_mall_seller_shipments_trackings_create_tracking(
      sellerConnection,
      {
        params: { shipmentId },
        body: {},
      },
    );
  typia.assert(shipmentTracking);
  // Get trackingId from the tracking object if exists
  const trackingId: string | undefined = (shipmentTracking as any).id;
  if (!trackingId)
    throw new Error("Tracking ID is missing from created shipment tracking.");
  // 4. Seller deletes the specific tracking record from the shipment.
  await api.functional.shoppingMall.seller.shipments.trackings.eraseTracking(
    sellerConnection,
    {
      shipmentId,
      trackingId,
    },
  );
  // There is no response body. The success is indicated by no error thrown.
}
