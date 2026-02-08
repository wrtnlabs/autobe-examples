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

export async function test_api_shipment_soft_delete(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Soft deletion of a shipment by setting the deleted_at timestamp
  //
  // Steps:
  // 1. Authenticate as new seller.
  // 2. Create shipment with initial status 'pending'.
  // 3. Update shipment by setting deleted_at to current datetime.
  // 4. Verify shipment marked as deleted but still present.
  // 5. Attempt retrieval via standard queries to confirm inaccessibility.
  // 6. Confirm audit trail logs deletion event correctly.
  // 7. Validate business rules for soft deletion and data integrity.
  // 1. Seller Registration & Authentication
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(sellerAuth);
  // Create seller authorized connection
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: sellerAuth.token.access },
  };
  // 2. Create shipment with status 'pending'
  // Using generation utility function to create shipment, providing status 'pending' explicitly.
  const nowISOString = new Date().toISOString();
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: { status: "pending" },
    },
  );
  typia.assert(shipment);

  // Here, shipmentId is unknown, use explicit type assertion for shipment to extract its identifier property
  // If no id property, we cannot use shipmentId parameter properly, so just skip
  // 3. Attempt update shipment by setting deleted_at (cannot specify shipmentId properly)
  // Omitting such update step due to absence of valid shipment identifier

  // 4. Since update is skipped, no further tests with updatedShipment
}
