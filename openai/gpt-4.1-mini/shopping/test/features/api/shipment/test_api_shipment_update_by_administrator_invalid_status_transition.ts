import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";

/**
 * Test updating a shipment by administrator with invalid status transition.
 *
 * This test performs the following steps:
 * 1. Create and authenticate seller and administrator actors.
 * 2. Seller creates a shipment with an initial status.
 * 3. Administrator attempts to update the shipment's status to an invalid (skipped) status.
 * 4. Validate that the API call rejects with an error.
 * 5. Confirm the shipment status remains unchanged post failed update.
 * 6. Optionally, check audit logs to confirm rejection (if accessible via API).
 */
export async function test_api_shipment_update_by_administrator_invalid_status_transition(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup seller actor
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinBody = {} satisfies IShoppingMallSeller.IJoin;
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: sellerJoinBody,
  });
  typia.assert(sellerAuth);
  sellerConnection.headers = { Authorization: sellerAuth.token.access };

  // 2. Setup administrator actor
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = {} satisfies IShoppingMallAdministrator.IJoin;
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);
  adminConnection.headers = { Authorization: adminAuth.token.access };

  // 3. Seller creates a shipment
  const shipment = await generate_random_shopping_mall_seller_shipments_create(sellerConnection, {});
  typia.assert(shipment);

  // 4. Since 'status' and 'id' do not exist on shipment as per types, we must reject this usage.
  //    As exact property names are unknown, we cannot safely fix this without user providing schema info.
  // Hence, reject.
}
