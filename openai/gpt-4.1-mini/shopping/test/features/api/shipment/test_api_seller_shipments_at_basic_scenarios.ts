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

export async function test_api_seller_shipments_at_basic_scenarios(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful retrieval of shipment details by authorized seller.
  // - A seller joins then creates a shipment via mock or assumed existing shipment.
  // - Seller queries shipment details and verifies the response.
  // 1. Seller A joins
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAAuthorized = await authorize_seller_join(sellerAConnection, { body: {} });
  sellerAConnection.headers = {
    Authorization: `Bearer ${sellerAAuthorized.token.access}`,
  };
  // 2. Seller B joins
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBAuthorized = await authorize_seller_join(sellerBConnection, { body: {} });
  sellerBConnection.headers = {
    Authorization: `Bearer ${sellerBAuthorized.token.access}`,
  };
  // For Scenario 1 and 3: We need a shipment for seller B
  // But as there's no creation endpoint, we simulate the shipment entity for test only
  // or assume SDK simulates it when we call for testing purposes
  // Create a shipmentId that presumably belongs to seller B for authorization test
  // Use typia.random to generate a valid UUID (simulate existing shipment ID)
  const validShipmentForSellerB = typia.random<string & tags.Format<"uuid">>();
  // SCENARIO 1: Seller B queries own shipment, expect 200 OK
  // Because creation API doesn't exist here, we assume validShipmentForSellerB is an actual shipment
  // and simulate the response through SDK call (simulate=true) or real backend
  // We query shipment details as seller B
  let shipment: IShoppingMallShipment | null = null;
  try {
    shipment = await api.functional.shoppingMall.seller.shipments.at(
      sellerBConnection,
      {
        shipmentId: validShipmentForSellerB,
      },
    );
    typia.assert(shipment);
    // Validate the nested seller ID matches sellerB's
    TestValidator.equals(
      "shipment seller id",
      shipment.seller.id,
      sellerBAuthorized.id,
    );
    // Validate shipment seller summary
    TestValidator.equals(
      "shipment seller email",
      shipment.seller.email,
      sellerBAuthorized.email,
    );
    TestValidator.predicate(
      "shipment has create and update timestamps",
      shipment.createdAt.length > 0 && shipment.updatedAt.length > 0,
    );
    TestValidator.predicate(
      "shipment status is non-empty",
      shipment.status.length > 0,
    );
  } catch (exp) {
    throw new Error(
      `Scenario 1 failed: unable to retrieve own shipment, error: ${exp}`,
    );
  }
  // SCENARIO 2: Seller A queries invalid/non-existent shipmentId, expect 404 error
  await TestValidator.httpError(
    "404 for non-existent shipment",
    404,
    async () => {
      await api.functional.shoppingMall.seller.shipments.at(sellerAConnection, {
        shipmentId: typia.random<string & tags.Format<"uuid">>(), // random UUID unlikely to exist
      });
    },
  );
  // SCENARIO 3: Seller A tries to access Seller B's shipment, expect 403 or 404
  await TestValidator.httpError(
    "403 or 404 for unauthorized shipment access",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.seller.shipments.at(sellerAConnection, {
        shipmentId: validShipmentForSellerB,
      });
    },
  );
}
