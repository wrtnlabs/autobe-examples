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
import { generate_random_shopping_mall_seller_shipments_trackings_update_trackings } from "../../../generate/generate_random_shopping_mall_seller_shipments_trackings_update_trackings";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shipment_tracking } from "../../../prepare/prepare_random_shopping_mall_shipment_tracking";

/**
 * Scenario 3: Authorization check to prevent seller from updating shipment tracking of another seller's shipment.
 *
 * Steps:
 * - Seller A joins and creates a shipment.
 * - Seller B joins and attempts to update Seller A's shipment tracking record.
 *
 * Validation:
 * - Operation is denied with appropriate authorization error.
 * - Tracking record remains unchanged for Seller A's shipment.
 * - Verify proper ownership verification on shipment update.
 * - Access control enforcement to prevent cross-seller modifications.
 */
export async function test_api_shipment_update_tracking_authorization_failure(
  connection: api.IConnection,
): Promise<void> {
  // Seller A joins
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(sellerA);
  sellerAConnection.headers = { Authorization: sellerA.token.access };
  // Seller A creates a shipment
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerAConnection,
    {},
  );
  typia.assert(shipment);
  // Cast shipment to allow access to id for params
  const shipmentId = (shipment as unknown as { id: string }).id;

  // Seller B joins
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(sellerB);
  sellerBConnection.headers = { Authorization: sellerB.token.access };
  // Seller B attempts to update Seller A's shipment tracking
  const updateBody = typia.random<IShoppingMallShipmentTracking.ICreate>();
  await TestValidator.httpError(
    "seller B unauthorized to update seller A shipment tracking",
    403,
    async () => {
      await generate_random_shopping_mall_seller_shipments_trackings_update_trackings(
        sellerBConnection,
        {
          params: { shipmentId },
          body: updateBody,
        },
      );
    },
  );
  // Verify that the shipment tracking of Seller A's shipment remains unchanged
  // (No direct read endpoint is specified, so we only verify no error from Seller A updating tracking)
  // Seller A updates shipment tracking successfully (control)
  const controlTracking =
    await generate_random_shopping_mall_seller_shipments_trackings_update_trackings(
      sellerAConnection,
      {
        params: { shipmentId },
        body: updateBody,
      },
    );
  typia.assert(controlTracking);
}
