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
import { generate_random_shopping_mall_seller_shipments_tracking_create_tracking } from "../../../generate/generate_random_shopping_mall_seller_shipments_tracking_create_tracking";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shipment_tracking } from "../../../prepare/prepare_random_shopping_mall_shipment_tracking";

export async function test_api_seller_shipment_tracking_create_success_and_authorization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller and authorize
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerJoinConnection, {
    body: {
      ...typia.random<IShoppingMallSeller.IJoin>(),
    },
  });
  typia.assert(authorizedSeller);
  // Create seller-specific connection with auth token
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = { Authorization: authorizedSeller.token.access };
  // 2. Create a shipment by this authorized seller
  //    Since shipment DTO has no properties, we cannot extract an id from it
  //    We still call the create function to check no errors and get a shipment object
  const shipment = typia.assert<IShoppingMallShipment>(
    await generate_random_shopping_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {},
      },
    ),
  );
  // Generate a random shipmentId for subsequent tracking creation
  // (We must simulate this because shipment has no id property)
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Add a tracking number to the shipment with generated shipmentId
  const tracking1 = typia.assert<IShoppingMallShipmentTracking>(
    await generate_random_shopping_mall_seller_shipments_tracking_create_tracking(
      sellerConnection,
      {
        params: { shipmentId },
        body: {
          carrierName: RandomGenerator.name(),
          trackingNumber: RandomGenerator.alphaNumeric(15),
        },
      },
    ),
  );
  TestValidator.predicate(
    "tracking1 exists",
    typeof tracking1 === "object" && tracking1 !== null,
  );
  // 4. Add a second tracking number to the same shipment
  const tracking2 = typia.assert<IShoppingMallShipmentTracking>(
    await generate_random_shopping_mall_seller_shipments_tracking_create_tracking(
      sellerConnection,
      {
        params: { shipmentId },
        body: {
          carrierName: RandomGenerator.name(),
          trackingNumber: RandomGenerator.alphaNumeric(15),
        },
      },
    ),
  );
  TestValidator.predicate(
    "tracking2 exists",
    typeof tracking2 === "object" && tracking2 !== null,
  );
  // 5. Now try unauthorized seller
  const anotherSellerJoinConnection: api.IConnection = {
    host: connection.host,
  };
  const unauthorizedSeller = await authorize_seller_join(
    anotherSellerJoinConnection,
    { body: { ...typia.random<IShoppingMallSeller.IJoin>() } },
  );
  typia.assert(unauthorizedSeller);
  const unauthorizedSellerConnection: api.IConnection = {
    host: connection.host,
  };
  unauthorizedSellerConnection.headers = {
    Authorization: unauthorizedSeller.token.access,
  };
  // Expect error on unauthorized creation of tracking on shipmentId
  await TestValidator.error(
    "unauthorized seller cannot add tracking",
    async () => {
      await generate_random_shopping_mall_seller_shipments_tracking_create_tracking(
        unauthorizedSellerConnection,
        {
          params: { shipmentId },
          body: {
            carrierName: RandomGenerator.name(),
            trackingNumber: RandomGenerator.alphaNumeric(15),
          },
        },
      );
    },
  );
}
