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
 * Test unauthorized creation attempt of shipment tracking record.
 *
 * 1. Seller A joins and authenticates
 * 2. Seller B joins and creates a shipment
 * 3. Seller A attempts to add shipment tracking to Seller B's shipment
 * 4. Seller A attempts to add shipment tracking to a non-existent shipment
 * 5. Validate that both attempts fail with 403 Forbidden or 404 Not Found
 */
export async function test_api_shipment_tracking_create_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Seller A join and authentication
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: RandomGenerator.alphaNumeric(6) + "@example.com",
      password: "SellerAPassword123!",
      shopName: RandomGenerator.name(1),
      shopDescription: null,
      logoUri: null,
    },
  });
  sellerAConnection.headers = {
    Authorization: sellerA.token.access,
  };
  // Seller B join and authentication
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: RandomGenerator.alphaNumeric(6) + "@example.com",
      password: "SellerBPassword123!",
      shopName: RandomGenerator.name(1),
      shopDescription: null,
      logoUri: null,
    },
  });
  sellerBConnection.headers = {
    Authorization: sellerB.token.access,
  };
  // Seller B creates shipment
  const shipmentB: IShoppingMallShipment =
    await generate_random_shopping_mall_seller_shipments_create(
      sellerBConnection,
      {},
    );
  typia.assert(shipmentB);
  // Seller A attempts to create shipment tracking for Seller B's shipment
  const unauthorizedTracking1: IShoppingMallShipmentTracking.IShipmentTrackingCreate =
    {
      shipment_id: shipmentB.id,
      carrier_name: "FakeCarrier",
      tracking_number: RandomGenerator.alphaNumeric(12),
    };
  await TestValidator.httpError(
    "seller A cannot add tracking to seller B's shipment",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.seller.shipmentTrackings.createShipmentTracking(
        sellerAConnection,
        {
          body: unauthorizedTracking1,
        },
      );
    },
  );
  // Seller A attempts to create shipment tracking for a non-existent shipment
  const unauthorizedTracking2: IShoppingMallShipmentTracking.IShipmentTrackingCreate =
    {
      shipment_id: typia.random<string & typia.tags.Format<"uuid">>(),
      carrier_name: "NonExistentCarrier",
      tracking_number: RandomGenerator.alphaNumeric(12),
    };
  await TestValidator.httpError(
    "seller A cannot add tracking to non-existent shipment",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.seller.shipmentTrackings.createShipmentTracking(
        sellerAConnection,
        {
          body: unauthorizedTracking2,
        },
      );
    },
  );
}
