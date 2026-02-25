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

export async function test_api_shipment_tracking_create_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongP@ssw0rd!",
      shopName: RandomGenerator.name(2),
      shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
      logoUri: null,
    },
  });
  typia.assert(sellerAuth);
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // 2. Create a shipment owned by the seller
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        carrierName: "FedEx",
        trackingNumber: RandomGenerator.alphaNumeric(12),
        orderItemIds: [typia.random<string & tags.Format<"uuid">>()],
      },
    },
  );
  typia.assert(shipment);
  // 3. Create shipment tracking record
  const trackingBody: IShoppingMallShipmentTracking.IShipmentTrackingCreate = {
    shipment_id: shipment.id,
    carrier_name: "FedEx",
    tracking_number: RandomGenerator.alphaNumeric(10),
  };
  const shipmentTracking =
    await api.functional.shoppingMall.seller.shipmentTrackings.createShipmentTracking(
      sellerConnection,
      {
        body: trackingBody,
      },
    );
  typia.assert(shipmentTracking);
  // 4. Validate shipment tracking response
  TestValidator.predicate(
    "shipment tracking has id",
    shipmentTracking.id !== undefined &&
      shipmentTracking.id !== null &&
      shipmentTracking.id.length > 0,
  );
  TestValidator.equals(
    "shipment tracking shipment id",
    shipmentTracking.shipment.id,
    shipment.id,
  );
  TestValidator.predicate(
    "shipment tracking has creation timestamp",
    shipmentTracking.createdAt.length > 0,
  );
  TestValidator.predicate(
    "shipment tracking has update timestamp",
    shipmentTracking.updatedAt.length > 0,
  );
  TestValidator.equals(
    "shipment tracking carrier name matches",
    shipmentTracking.carrierName,
    trackingBody.carrier_name,
  );
  TestValidator.equals(
    "shipment tracking tracking number matches",
    shipmentTracking.trackingNumber,
    trackingBody.tracking_number,
  );
  TestValidator.equals(
    "shipment tracking deletedAt is null",
    shipmentTracking.deletedAt,
    null,
  );
  // 5. Verify seller ownership
  TestValidator.equals(
    "shipment seller matches seller id",
    shipment.sellerId,
    sellerAuth.id,
  );
}
