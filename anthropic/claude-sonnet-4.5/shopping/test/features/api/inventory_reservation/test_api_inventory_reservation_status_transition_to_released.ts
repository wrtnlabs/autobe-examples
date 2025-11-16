import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallInventoryReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryReservation";

/**
 * Test manual release of an active inventory reservation before its natural
 * expiration.
 *
 * This test validates the administrative capability to manually release
 * inventory reservations, transitioning them from 'active' to 'released'
 * status. When a reservation is released, the reserved inventory quantity is
 * immediately returned to available stock, making it accessible for other
 * buyers.
 *
 * Test workflow:
 *
 * 1. Authenticate as admin to gain necessary permissions
 * 2. Prepare update request to transition reservation status to 'released'
 * 3. Call the update API with the release status change
 * 4. Verify the status transition succeeded
 * 5. Validate the complete reservation response structure
 */
export async function test_api_inventory_reservation_status_transition_to_released(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to obtain necessary permissions
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: typia.random<string & tags.Format<"password">>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "super_admin",
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Generate a reservation ID to update (simulating an existing active reservation)
  const reservationId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Update the reservation status to 'released'
  const releasedReservation: IShoppingMallInventoryReservation =
    await api.functional.shoppingMall.admin.inventoryReservations.update(
      connection,
      {
        reservationId: reservationId,
        body: {
          reservation_status: "released",
        } satisfies IShoppingMallInventoryReservation.IUpdate,
      },
    );
  typia.assert(releasedReservation);

  // Step 4: Verify the status transition succeeded
  TestValidator.equals(
    "reservation status should be released",
    releasedReservation.reservation_status,
    "released",
  );

  // Step 5: Validate the reservation ID matches
  TestValidator.equals(
    "reservation ID should match",
    releasedReservation.id,
    reservationId,
  );
}
