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

export async function test_api_shipment_tracking_update_tracking_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins the platform
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  sellerConnection.headers = { Authorization: sellerJoin.token.access };
  // 2. Seller creates a shipment
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(shipment);
  // 3. Seller creates a shipment tracking record linked to shipment
  const shipmentEntity = shipment as IEntity;
  const tracking =
    await generate_random_shopping_mall_seller_shipments_trackings_create_tracking(
      sellerConnection,
      { params: { shipmentId: shipmentEntity.id }, body: {} },
    );
  typia.assert(tracking);
  // 4. Administrator joins the platform
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_administrator_join(adminConnection, {
    body: typia.random<IShoppingMallAdministrator.IJoin>(),
  });
  adminConnection.headers = { Authorization: adminJoin.token.access };
  // 5. Administrator attempts to update a non-existent tracking record
  const invalidTrackingId = typia.random<string & tags.Format<"uuid">>();
  const trackingEntity = tracking as IEntity;
  // Ensure invalidTrackingId differs from existing one
  if (invalidTrackingId === trackingEntity.id) {
    throw new Error(
      "Generated invalidTrackingId should differ from created tracking id",
    );
  }
  await TestValidator.httpError(
    "update tracking with invalid trackingId should fail with 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.shipments.trackings.updateTracking(
        adminConnection,
        {
          shipmentId: shipmentEntity.id,
          trackingId: invalidTrackingId,
          body: typia.random<IShoppingMallShipmentTracking.IUpdate>(),
        },
      );
    },
  );
}
