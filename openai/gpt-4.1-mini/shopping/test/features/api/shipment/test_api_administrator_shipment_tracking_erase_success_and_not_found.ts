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

export async function test_api_administrator_shipment_tracking_erase_success_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful deletion of a shipment tracking record by an administrator.
  // 1. Administrator registration and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = typia.random<IShoppingMallAdministrator.IJoin>();
  await authorize_administrator_join(adminConnection, { body: adminJoinBody });
  // 2. Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinBody = typia.random<IShoppingMallSeller.IJoin>();
  await authorize_seller_join(sellerConnection, { body: sellerJoinBody });
  // 3. Seller creates shipment
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {},
  );
  typia.assert(shipment);
  // Assert shipment to have id property as string
  const shipmentWithId = shipment as unknown as { id: string };

  // 4. Seller adds tracking record to shipment
  const tracking =
    await generate_random_shopping_mall_seller_shipments_trackings_create_tracking(
      sellerConnection,
      {
        params: { shipmentId: shipmentWithId.id },
      },
    );
  typia.assert(tracking);
  // Assert tracking to have id property as string
  const trackingWithId = tracking as unknown as { id: string };

  // 5. Administrator deletes existing shipment tracking record
  await api.functional.shoppingMall.administrator.shipments.trackings.eraseTracking(
    adminConnection,
    {
      shipmentId: shipmentWithId.id,
      trackingId: trackingWithId.id,
    },
  );

  // 6. Attempting to delete the same tracking again should result in 404 Not Found
  await TestValidator.httpError(
    "delete non-existing tracking",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.shipments.trackings.eraseTracking(
        adminConnection,
        {
          shipmentId: shipmentWithId.id,
          trackingId: trackingWithId.id,
        },
      );
    },
  );

  // 7. Scenario 2: Attempt deletion of non-existent tracking with invalid trackingId
  let nonExistentTrackingId = typia.random<string & tags.Format<"uuid">>();
  // Ensure the invalid ID is different from previous
  if (nonExistentTrackingId === trackingWithId.id) {
    // Regenerate if collision occurs
    nonExistentTrackingId = typia.random<string & tags.Format<"uuid">>();
  }

  await TestValidator.httpError(
    "delete tracking with invalid trackingId",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.shipments.trackings.eraseTracking(
        adminConnection,
        {
          shipmentId: shipmentWithId.id,
          trackingId: nonExistentTrackingId,
        },
      );
    },
  );
}
