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
import { generate_random_shopping_mall_administrator_shipments_trackings_update_trackings } from "../../../generate/generate_random_shopping_mall_administrator_shipments_trackings_update_trackings";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shipment_tracking } from "../../../prepare/prepare_random_shopping_mall_shipment_tracking";

/**
 * Test batch updating multiple shipment tracking records transactionally by admin.
 * All or none updates must apply to ensure data consistency.
 * Invalid inputs rollback entire batch update.
 */
export async function test_api_shipment_tracking_batch_update_transactional_integrity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IShoppingMallAdministrator.IJoin =
    typia.random<IShoppingMallAdministrator.IJoin>();
  await authorize_administrator_join(adminConnection, { body: adminJoinBody });
  const adminLoginBody: IShoppingMallAdministrator.ILogin =
    typia.random<IShoppingMallAdministrator.ILogin>();
  await authorize_administrator_login(adminConnection, {
    body: adminLoginBody,
  });
  // 2. Seller creates a shipment (simulate existing seller)
  const shipmentRaw =
    await generate_random_shopping_mall_seller_shipments_create(
      adminConnection,
      {},
    );
  typia.assert(shipmentRaw);
  // Manually cast or assert 'shipment' as having 'id' string property
  // This is needed because IShoppingMallShipment type is empty in DTO but used with id string
  const shipment = shipmentRaw as {
    id: string;
  };
  // Prepare valid tracking data
  const trackingBodies: IShoppingMallShipmentTracking.ICreate[] =
    ArrayUtil.repeat(3, () =>
      typia.random<IShoppingMallShipmentTracking.ICreate>(),
    );
  // 3. Administrator updates multiple tracking records sequentially
  for (const trackingBody of trackingBodies) {
    const updatedTracking =
      await generate_random_shopping_mall_administrator_shipments_trackings_update_trackings(
        adminConnection,
        {
          body: trackingBody,
          params: { shipmentId: shipment.id },
        },
      );
    typia.assert(updatedTracking);
  }
  // 4. Attempt update with invalid tracking data to test rollback behavior
  const invalidTrackingBody: Partial<IShoppingMallShipmentTracking.ICreate> = {
    carrierName: "", // Invalid: carrierName should be non-empty
    trackingNumber: "", // Invalid: trackingNumber should be non-empty
  };
  await TestValidator.error(
    "batch update rollback on invalid data",
    async () => {
      await generate_random_shopping_mall_administrator_shipments_trackings_update_trackings(
        adminConnection,
        {
          body: invalidTrackingBody as IShoppingMallShipmentTracking.ICreate,
          params: { shipmentId: shipment.id },
        },
      );
    },
  );
}
