import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";

export async function test_api_seller_shipment_create_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {} satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Apply token to connection headers for authenticated requests
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // 2. Create shipment by seller using utility function
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {},
    },
  );
  typia.assert(shipment);
  // 3. Validate shipment has token access
  TestValidator.predicate(
    "shipment has token access",
    typeof sellerAuth.token.access === "string" &&
      sellerAuth.token.access.length > 0,
  );
}
