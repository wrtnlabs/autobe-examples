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
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_seller_shipment_tracking_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller join and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssword1234",
      shopName: "Test Shop",
      shopDescription: "Test Description",
      logoUri: null,
    },
  });
  typia.assert(sellerAuth);
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // 2. Create a shipment by the seller
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        carrierName: "InitialCarrier",
        trackingNumber: "InitialTrack123",
        orderItemIds: [typia.random<string & tags.Format<"uuid">>()],
      },
    },
  );
  typia.assert(shipment);
  // 3. Create a shipment tracking record
  const createTrackingBody: IShoppingMallShipmentTracking.IShipmentTrackingCreate =
    {
      shipment_id: shipment.id,
      carrier_name: "InitialCarrier",
      tracking_number: "InitialTrack123",
    };
  const trackingRecord =
    await api.functional.shoppingMall.seller.shipmentTrackings.createShipmentTracking(
      sellerConnection,
      { body: createTrackingBody },
    );
  typia.assert(trackingRecord);
  // 4. Perform update of the shipment tracking
  const updateBody: IShoppingMallShipmentTracking.IUpdate = {
    carrierName: "UpdatedCarrier",
    trackingNumber: "UpdatedTrack456",
  };
  const updatedTracking =
    await api.functional.shoppingMall.seller.shipmentTrackings.update(
      sellerConnection,
      {
        shipmentTrackingId: trackingRecord.id,
        body: updateBody,
      },
    );
  typia.assert(updatedTracking);
  // 5. Validate updated fields
  TestValidator.equals(
    "shipmentTrackingId unchanged",
    updatedTracking.id,
    trackingRecord.id,
  );
  TestValidator.equals(
    "carrierName updated",
    updatedTracking.carrierName,
    updateBody.carrierName,
  );
  TestValidator.equals(
    "trackingNumber updated",
    updatedTracking.trackingNumber,
    updateBody.trackingNumber,
  );
  // 6. Validate correct shipment relation
  TestValidator.equals(
    "shipment id matches",
    updatedTracking.shipment.id,
    shipment.id,
  );
  // 7. Validate ISO 8601 UUID format for the Id
  TestValidator.predicate(
    "shipmentTrackingId UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      updatedTracking.id,
    ),
  );
  // 8. Validate timestamps and nullables
  TestValidator.predicate(
    "createdAt valid date-time",
    !isNaN(Date.parse(updatedTracking.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt valid date-time",
    !isNaN(Date.parse(updatedTracking.updatedAt)),
  );
  TestValidator.equals("deletedAt is null", updatedTracking.deletedAt, null);
  // 9. TODO: Rollback and failure tests can be implemented in other test functions covering negative cases.
}
