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

export async function test_api_seller_shipments_create_success_and_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Seller 1 registration and authorization
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Authorized = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongP@ss1",
      shopName: RandomGenerator.name(2),
      shopDescription: null,
      logoUri: null,
    },
  });
  seller1Connection.headers = {
    Authorization: `Bearer ${seller1Authorized.token.access}`,
  };
  // Generate a shipment to get valid orderItemIds for seller1
  const shipmentCreateInput = {
    carrierName: "FastCarrier",
    trackingNumber: RandomGenerator.alphaNumeric(18),
    orderItemIds: [],
  } satisfies IShoppingMallShipment.ICreate;
  // Note: generate_random_shopping_mall_seller_shipments_create automatically prepares valid orderItemIds
  const shipment1 = await generate_random_shopping_mall_seller_shipments_create(
    seller1Connection,
    { body: shipmentCreateInput },
  );
  typia.assert(shipment1);
  TestValidator.predicate("shipment1 has id", shipment1.id.length > 0);
  TestValidator.equals("shipment1 status", shipment1.status, "pending");
  TestValidator.equals(
    "shipment1 seller id",
    shipment1.seller.id,
    seller1Authorized.id,
  );
  // We do NOT have direct access to orderItemIds from shipment1, so
  // reuse the orderItemIds used in the submission
  const validOrderItemIds = shipmentCreateInput.orderItemIds;
  // Step 2: Seller 2 registration and authorization
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Authorized = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongP@ss2",
      shopName: RandomGenerator.name(2),
      shopDescription: null,
      logoUri: null,
    },
  });
  seller2Connection.headers = {
    Authorization: `Bearer ${seller2Authorized.token.access}`,
  };
  // Step 3: Unauthorized shipment creation attempt by seller 2 using seller 1's order items
  const unauthorizedInput = {
    carrierName: "SlowCarrier",
    trackingNumber: RandomGenerator.alphaNumeric(18),
    orderItemIds: validOrderItemIds,
  } satisfies IShoppingMallShipment.ICreate;
  await TestValidator.error(
    "unauthorized seller shipment create rejects",
    async () => {
      await generate_random_shopping_mall_seller_shipments_create(
        seller2Connection,
        { body: unauthorizedInput },
      );
    },
  );
  // Step 4: Shipment creation business rule violation
  // Compose invalid order item ids: non-existent and reuse some valid ones
  const badOrderItemIds = [
    typia.random<string & tags.Format<"uuid">>(), // Non-existent ID
    ...validOrderItemIds,
  ];
  const badInput = {
    carrierName: "BadCarrier",
    trackingNumber: RandomGenerator.alphaNumeric(18),
    orderItemIds: badOrderItemIds,
  } satisfies IShoppingMallShipment.ICreate;
  await TestValidator.error(
    "shipment creation with invalid order items rejects",
    async () => {
      await generate_random_shopping_mall_seller_shipments_create(
        seller1Connection,
        { body: badInput },
      );
    },
  );
}
