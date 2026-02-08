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

export async function test_api_shipment_update_batch_tracking_success(
  connection: api.IConnection,
): Promise<void> {
  // Seller joins and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(authorized);
  // Setup seller connection token
  sellerConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Seller creates a shipment
  const shipmentRaw = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {},
  );
  // Cast to IShoppingMallShipment with id
  const shipment = typia.assert<IShoppingMallShipment & { id: string }>(shipmentRaw);
  // Update multiple shipment tracking records sequentially to simulate batch update
  const trackingBodies = [
    {
      carrierName: `Carrier-${RandomGenerator.alphabets(5)}`,
      trackingNumber: `TN-${RandomGenerator.alphaNumeric(8)}`,
    },
    {
      carrierName: `Carrier-${RandomGenerator.alphabets(5)}`,
      trackingNumber: `TN-${RandomGenerator.alphaNumeric(8)}`,
    },
  ];
  const updatedTrackingsRaw: unknown[] = [];
  for (const body of trackingBodies) {
    const updatedRaw =
      await generate_random_shopping_mall_seller_shipments_trackings_update_trackings(
        sellerConnection,
        { params: { shipmentId: shipment.id }, body },
      );
    updatedTrackingsRaw.push(updatedRaw);
  }
  // Cast updated trackings properly
  const updatedTrackings = updatedTrackingsRaw.map(
    (item) => typia.assert<IShoppingMallShipmentTracking & { carrierName: string; trackingNumber: string }>(item),
  );
  // Validate the updated tracking info count
  TestValidator.equals(
    "all updated trackings match in count",
    updatedTrackings.length,
    trackingBodies.length,
  );
  for (let i = 0; i < trackingBodies.length; ++i) {
    TestValidator.equals(
      `carrierName at index ${i}`,
      updatedTrackings[i].carrierName,
      trackingBodies[i].carrierName,
    );
    TestValidator.equals(
      `trackingNumber at index ${i}`,
      updatedTrackings[i].trackingNumber,
      trackingBodies[i].trackingNumber,
    );
  }
  // Authorization enforcement check with another seller
  const anotherSellerConnection: api.IConnection = { host: connection.host };
  const anotherAuthorized = await authorize_seller_join(
    anotherSellerConnection,
    {
      body: typia.random<IShoppingMallSeller.IJoin>(),
    },
  );
  typia.assert(anotherAuthorized);
  anotherSellerConnection.headers = {
    Authorization: `Bearer ${anotherAuthorized.token.access}`,
  };
  await TestValidator.error(
    "unauthorized seller unable to update tracking",
    async () => {
      await generate_random_shopping_mall_seller_shipments_trackings_update_trackings(
        anotherSellerConnection,
        { params: { shipmentId: shipment.id }, body: trackingBodies[0] },
      );
    },
  );
}
