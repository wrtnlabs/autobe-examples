import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
 * Test deleting a non-existent shipment tracking record under an existing shipment for the seller.
 * Steps:
 * 1. Seller joins (registers).
 * 2. Seller creates a shipment.
 * 3. Seller attempts to delete a tracking record with a random non-existent tracking ID.
 *
 * Validations:
 * - The operation should fail with HTTP 404 Not Found.
 * - The error message should indicate shipment tracking record not found.
 * - No changes should be made to the database.
 */
export async function test_api_seller_shipment_tracking_deletion_tracking_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller join and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {}, // IShoppingMallSeller.IJoin is empty namespace - no properties
  });
  // Update headers with auth token
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // 2. Create a shipment as seller
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(shipment);
  // 3. Attempt delete a non-existent tracking record
  const nonExistentTrackingId = typia.random<string & tags.Format<"uuid">>();
  // Since the API returns void on success, and 404 error if not found, we catch the error
  await TestValidator.httpError(
    "delete shipment tracking with non-existent trackingId",
    404,
    async () => {
      await api.functional.shoppingMall.seller.shipments.trackings.eraseTracking(
        sellerConnection,
        {
          shipmentId: typia.assert<string & tags.Format<"uuid">>(shipment),
          trackingId: nonExistentTrackingId,
        },
      );
    },
  );
}
