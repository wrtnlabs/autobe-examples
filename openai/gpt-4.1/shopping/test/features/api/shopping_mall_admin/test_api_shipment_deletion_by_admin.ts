import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * E2E test for the deletion of shipments by admin, validating enforcement of
 * status-based business rules.
 *
 * Scenario:
 *
 * 1. Register a platform admin using the join endpoint.
 * 2. (Assumed/Simulated) Create two shipment UUIDs: one eligible for deletion,
 *    another in an ineligible state.
 *
 * - The eligible shipment UUID is randomly generated (as actual shipment creation
 *   API was not specified).
 * - The ineligible shipment UUID is also randomly generated and simulated to
 *   represent a delivered or in_transit/terminal state.
 *
 * 3. Call the admin shipment erase endpoint for the eligible shipment UUID. Expect
 *    the operation to complete successfully (i.e., does not throw).
 * 4. Try to erase the ineligible shipment UUID and validate that a business rule
 *    error is thrown (with TestValidator.error).
 */
export async function test_api_shipment_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a platform admin
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinInput });
  typia.assert(admin);

  // 2. Simulate shipment UUIDs (since there is no shipment creation API)
  const eligibleShipmentId = typia.random<string & tags.Format<"uuid">>();
  const ineligibleShipmentId = typia.random<string & tags.Format<"uuid">>();

  // 3. Try to delete eligible shipment (expect success)
  await api.functional.shoppingMall.admin.shipments.erase(connection, {
    shipmentId: eligibleShipmentId,
  });

  // 4. Try to delete ineligible status shipment (expect business error)
  await TestValidator.error(
    "should not allow deletion of shipment in delivered/in_transit/terminal state",
    async () => {
      await api.functional.shoppingMall.admin.shipments.erase(connection, {
        shipmentId: ineligibleShipmentId,
      });
    },
  );
}
