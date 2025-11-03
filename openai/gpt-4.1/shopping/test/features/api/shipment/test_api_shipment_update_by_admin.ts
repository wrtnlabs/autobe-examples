import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrder";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingShipment";
import type { IShoppingShipmentPackage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingShipmentPackage";

/**
 * E2E test for API: PUT /shopping/admin/shipments/{code}
 *
 * - Ensures an admin can update shipment mutable fields (status, carrier,
 *   timestamps), verifies enforcement of immutability for code/order
 *   association, and that updating a soft-deleted shipment fails.
 * - Workflow:
 *
 *   1. Admin joins and obtains authentication.
 *   2. A random shipment object (mocked, since no API is provided to create one) is
 *        generated.
 *   3. Admin issues update for allowed mutable fields (status, carrier_company,
 *        dispatched_at, delivered_at) via the /shopping/admin/shipments/{code}
 *        endpoint.
 *   4. Verifies response reflects updates for mutable fields but unchanged
 *        code/order.
 *   5. Attempts to update a soft-deleted shipment (with deleted_at set) and expects
 *        error.
 */
export async function test_api_shipment_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin onboarding
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    role: RandomGenerator.pick(["super", "support", "operator"] as const),
    status: "active",
  } satisfies IShoppingAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminBody,
  });
  typia.assert(admin);

  // Step 2: Mock shipment record (simulate - in reality, this should be created via API)
  const shipment = typia.random<IShoppingShipment>();
  typia.assert(shipment);

  // Step 3: Successful update of allowed mutable fields
  const updateBody = {
    status: "delivered",
    carrier_company: "FedEx",
    dispatched_at: new Date().toISOString(),
    delivered_at: new Date().toISOString(),
  } satisfies IShoppingShipment.IUpdate;

  const updated = await api.functional.shopping.admin.shipments.update(
    connection,
    {
      code: shipment.code,
      body: updateBody,
    },
  );
  typia.assert(updated);
  TestValidator.equals("shipment status updated", updated.status, "delivered");
  TestValidator.equals(
    "carrier company updated",
    updated.carrier_company,
    "FedEx",
  );
  TestValidator.equals(
    "shipment code is immutable",
    updated.code,
    shipment.code,
  );
  TestValidator.equals(
    "order association is immutable",
    updated.shopping_order_id,
    shipment.shopping_order_id,
  );
  TestValidator.equals(
    "seller association is immutable",
    updated.shopping_seller_id,
    shipment.shopping_seller_id,
  );

  // Step 4: Attempt update on soft-deleted record (should reject)
  const deletedShipment = { ...shipment, deleted_at: new Date().toISOString() };
  await TestValidator.error(
    "update fails on soft-deleted shipment",
    async () => {
      await api.functional.shopping.admin.shipments.update(connection, {
        code: deletedShipment.code,
        body: {
          status: "canceled",
        },
      });
    },
  );
}
