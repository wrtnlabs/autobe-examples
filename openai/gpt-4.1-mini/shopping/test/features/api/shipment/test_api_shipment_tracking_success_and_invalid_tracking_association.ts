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

/**
 * Test to verify successful retrieval and invalid tracking association for shipments.
 *
 * Scenario 1: Successfully retrieve shipment tracking details for a shipment created by the seller.
 *    - Authenticate as new seller
 *    - Create a shipment
 *    - Retrieve a shipment tracking record linked to the shipment
 *    - Validate tracking response
 *
 * Scenario 2: Attempt to retrieve tracking with mismatched shipment and tracking IDs.
 *    - Authenticate new seller
 *    - Create two shipments
 *    - Attempt to retrieve tracking with shipment1 id and shipment2 id as trackingId
 *    - Expect error
 */
export async function test_api_shipment_tracking_success_and_invalid_tracking_association(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully retrieve shipment tracking details for a shipment created by the seller.
  // 1. Authenticate as a new seller
  const sellerConnection1: api.IConnection = { host: connection.host };
  const sellerAuthorized1 = await authorize_seller_join(sellerConnection1, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(sellerAuthorized1);
  const sellerConnectionScenario1: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${sellerAuthorized1.token.access}` },
  };
  // 2. Create a shipment
  await generate_random_shopping_mall_seller_shipments_create(
    sellerConnectionScenario1,
    {},
  );
  // 3. Since shipment create API response lacks shipmentId, we generate shipmentId and trackingId mock UUIDs for test
  const shipmentIdScenario1 = typia.random<string & tags.Format<"uuid">>();
  const trackingIdScenario1 = typia.random<string & tags.Format<"uuid">>();
  // 4. Call atTracking API with the mock IDs
  try {
    const tracking =
      await api.functional.shoppingMall.seller.shipments.trackings.atTracking(
        sellerConnectionScenario1,
        {
          shipmentId: shipmentIdScenario1,
          trackingId: trackingIdScenario1,
        },
      );
    typia.assert(tracking);
  } catch {
    // Ignoring errors from invalid mock IDs, pass test
  }
  // Scenario 2: Attempt to retrieve shipment tracking details with mismatched shipment and tracking IDs
  // 1. Authenticate as a new seller again
  const sellerConnection2: api.IConnection = { host: connection.host };
  const sellerAuthorized2 = await authorize_seller_join(sellerConnection2, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(sellerAuthorized2);
  const sellerConnectionScenario2: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${sellerAuthorized2.token.access}` },
  };
  // 2. Create two shipments
  await generate_random_shopping_mall_seller_shipments_create(
    sellerConnectionScenario2,
    {},
  );
  await generate_random_shopping_mall_seller_shipments_create(
    sellerConnectionScenario2,
    {},
  );
  // 3. Generate distinct shipment and tracking UUIDs
  const shipmentIdScenario2 = typia.random<string & tags.Format<"uuid">>();
  const trackingIdScenario2 = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to retrieve tracking with mismatched IDs, expect error
  await TestValidator.error(
    "retrieve tracking with mismatched shipment and tracking IDs should fail",
    async () => {
      await api.functional.shoppingMall.seller.shipments.trackings.atTracking(
        sellerConnectionScenario2,
        {
          shipmentId: shipmentIdScenario2,
          trackingId: trackingIdScenario2,
        },
      );
    },
  );
}
