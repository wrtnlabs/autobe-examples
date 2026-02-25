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

export async function test_api_seller_shipment_tracking_update_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Scenario:
  // This scenario tests that attempting to update a seller shipment tracking
  // without proper authentication fails with an authorization error, ensuring
  // security of shipment tracking data.
  // 1. Register a new seller via join utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "strong-password",
      shopName: typia.random<string & tags.Format<"email">>().split("@")[0],
      shopDescription: null,
      logoUri: null,
    },
  });
  // 2. Use the seller connection to simulate creating a shipment tracking record
  // Since there is no direct API to create shipment tracking, mock a shipmentTrackingId
  // with a random uuid for update attempt
  const shipmentTrackingId = typia.random<string & tags.Format<"uuid">>();
  // 3. Prepare update body with carrierName and trackingNumber
  const updateBody: IShoppingMallShipmentTracking.IUpdate = {
    carrierName: "FedEx",
    trackingNumber: "1234567890",
  };
  // 4. Attempt to update shipment tracking using base connection (unauthenticated)
  // Expect an HttpError with 401 Unauthorized or 403 Forbidden
  await TestValidator.httpError(
    "update without authentication should fail",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.seller.shipmentTrackings.update(
        connection,
        {
          shipmentTrackingId,
          body: updateBody,
        },
      );
    },
  );
}
