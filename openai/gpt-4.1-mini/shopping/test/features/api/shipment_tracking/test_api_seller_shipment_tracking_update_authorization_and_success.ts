import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTracking";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_shipment_tracking_update_authorization_and_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful update of tracking info by authorized seller
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1 = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      shopName: RandomGenerator.name(1),
      shopDescription: null,
      logoUri: null,
    },
  });
  seller1Connection.headers = {
    Authorization: `Bearer ${seller1.token.access}`,
  };
  // Simulate or create shipmentId for seller1 (here we simulate UUID)
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  // Prepare valid tracking update data
  const trackingUpdate: IShoppingMallShipmentTracking.IUpdate = {
    carrierName: "FedEx",
    trackingNumber: RandomGenerator.alphaNumeric(12),
  };
  // Perform update tracking for seller1 (authorized)
  const updatedTracking =
    await api.functional.shoppingMall.seller.shipments.tracking.updateTracking(
      seller1Connection,
      {
        shipmentId,
        body: trackingUpdate,
      },
    );
  typia.assert(updatedTracking);
  // Validate response matches request data
  TestValidator.equals(
    "carrier name matches",
    updatedTracking.carrierName,
    trackingUpdate.carrierName,
  );
  TestValidator.equals(
    "tracking number matches",
    updatedTracking.trackingNumber,
    trackingUpdate.trackingNumber,
  );
  // Scenario 2: Unauthorized seller attempts to update the shipment tracking
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2 = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      shopName: RandomGenerator.name(1),
      shopDescription: null,
      logoUri: null,
    },
  });
  seller2Connection.headers = {
    Authorization: `Bearer ${seller2.token.access}`,
  };
  // Attempt to patch seller1's shipment with seller2 - expect error
  await TestValidator.error(
    "unauthorized shipment tracking update",
    async () => {
      await api.functional.shoppingMall.seller.shipments.tracking.updateTracking(
        seller2Connection,
        {
          shipmentId,
          body: {
            carrierName: "UPS",
            trackingNumber: RandomGenerator.alphaNumeric(10),
          },
        },
      );
    },
  );
}
