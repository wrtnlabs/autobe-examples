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

export async function test_api_seller_shipment_tracking_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      shopName: "Test Shop",
      shopDescription: null,
      logoUri: null,
    },
  });
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // We need to create a shipment and tracking in DB to test the retrieval
  // since no such utility function or API for creation was provided, we simulate the retrieval with
  // a valid shipmentTrackingId from the sellerAuth token id or random one for test flow.
  // For test fidelity, we must call the .at() API with a valid shipmentTrackingId
  // but since we cannot create actual data, we randomly generate one -- test might fail in real scenario
  const shipmentTrackingId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the shipment tracking info
  const tracking =
    await api.functional.shoppingMall.seller.shipmentTrackings.at(
      sellerConnection,
      { shipmentTrackingId },
    );
  typia.assert(tracking);
  // Validate fields for meaningfulness
  TestValidator.predicate(
    "carrier name is non-empty",
    typeof tracking.carrierName === "string" && tracking.carrierName.length > 0,
  );
  TestValidator.predicate(
    "tracking number is non-empty",
    typeof tracking.trackingNumber === "string" &&
      tracking.trackingNumber.length > 0,
  );
  TestValidator.predicate(
    "createdAt is a valid ISO date",
    !isNaN(Date.parse(tracking.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is a valid ISO date",
    !isNaN(Date.parse(tracking.updatedAt)),
  );
  // Authentication check implicitly by use of authorize_seller_join
}
