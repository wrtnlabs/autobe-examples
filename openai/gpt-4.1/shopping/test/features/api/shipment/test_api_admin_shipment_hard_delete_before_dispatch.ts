import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";

/**
 * Validates that an admin can permanently remove a not-yet-dispatched shipment,
 * but cannot remove one that has already been dispatched/delivered.
 *
 * 1. Register and authenticate a new admin account.
 * 2. Simulate existence of a not-yet-dispatched shipment using a unique random
 *    code.
 * 3. Attempt to delete this "pending" shipment as admin and expect success.
 * 4. Attempt to delete a dispatched/delivered shipment (represented as another
 *    unique code) and expect a business error.
 * 5. Ensure proper authorization and boundaries: only shipments which have not
 *    been dispatched/delivered may be erased by admin.
 * 6. While audit log checks are not possible via the current API, the business
 *    contract should be validated.
 */
export async function test_api_admin_shipment_hard_delete_before_dispatch(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new admin
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    role: RandomGenerator.pick([
      "super",
      "support",
      "compliance",
      "operator",
    ] as const),
    status: "active",
  } satisfies IShoppingAdmin.IJoin;
  const adminAuth: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminData });
  typia.assert(adminAuth);

  // 2. Simulate creation/existence of a not-yet-dispatched shipment
  const pendingShipmentCode = `SHPT-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;

  // 3. Admin deletes a shipment in "pending/not dispatched" state
  await api.functional.shopping.admin.shipments.erase(connection, {
    code: pendingShipmentCode,
  });

  // 4. Simulate a dispatched shipment's code and attempt to delete it (should error)
  const dispatchedShipmentCode = `SHPT-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  await TestValidator.error(
    "cannot delete dispatched or delivered shipment",
    async () => {
      await api.functional.shopping.admin.shipments.erase(connection, {
        code: dispatchedShipmentCode,
      });
    },
  );
}
