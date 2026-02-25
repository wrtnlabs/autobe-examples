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

export async function test_api_shipment_tracking_create_duplicate_tracking_number(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test handling of duplicate shipment tracking number entries.
  // Step 1: Register a new seller and create a new connection with authentication.
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: "1234",
      shopName: RandomGenerator.name(1),
      shopDescription: null,
      logoUri: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  // Step 2: Create a shipment owned by the authenticated seller.
  const shipmentBody = {
    carrierName: "DHL",
    trackingNumber: RandomGenerator.alphaNumeric(12),
    orderItemIds: [typia.random<string & typia.tags.Format<"uuid">>()], // Random UUID for order items - normally the system requires valid IDs, but for E2E test, a random valid UUID is used.
  } satisfies IShoppingMallShipment.ICreate;
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    { body: shipmentBody },
  );
  typia.assert(shipment);
  // Step 3: Create a shipment tracking record with a specific tracking number.
  const trackingCreateBody: IShoppingMallShipmentTracking.IShipmentTrackingCreate =
    {
      shipment_id: shipment.id,
      carrier_name: shipmentBody.carrierName,
      tracking_number: shipmentBody.trackingNumber,
    };
  const tracking1 =
    await api.functional.shoppingMall.seller.shipmentTrackings.createShipmentTracking(
      sellerConnection,
      { body: trackingCreateBody },
    );
  typia.assert(tracking1);
  TestValidator.equals(
    "tracking number match",
    tracking1.trackingNumber,
    shipmentBody.trackingNumber,
  );
  TestValidator.equals(
    "carrier name match",
    tracking1.carrierName,
    shipmentBody.carrierName,
  );
  // Step 4: Attempt to add another tracking record with the same tracking number for the same shipment.
  await TestValidator.error(
    "duplicate tracking number in same shipment rejected",
    async () => {
      await api.functional.shoppingMall.seller.shipmentTrackings.createShipmentTracking(
        sellerConnection,
        { body: trackingCreateBody },
      );
    },
  );
  // Step 5: Create another shipment to test duplicate tracking number rejection across shipments.
  const shipment2 = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    { body: shipmentBody },
  );
  typia.assert(shipment2);
  const trackingCreateBodyOtherShipment: IShoppingMallShipmentTracking.IShipmentTrackingCreate =
    {
      shipment_id: shipment2.id,
      carrier_name: shipmentBody.carrierName,
      tracking_number: shipmentBody.trackingNumber, // same tracking number as before
    };
  await TestValidator.error(
    "duplicate tracking number across different shipments rejected",
    async () => {
      await api.functional.shoppingMall.seller.shipmentTrackings.createShipmentTracking(
        sellerConnection,
        { body: trackingCreateBodyOtherShipment },
      );
    },
  );
}
