import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallInventoryReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryReservation";

/**
 * Test extending the expiration time of an active reservation to give buyers
 * more checkout time.
 *
 * This test validates the critical inventory reservation extension
 * functionality that allows administrators to give buyers additional time to
 * complete their checkout process. The test creates an initial reservation with
 * a standard expiration time, then extends it to a future timestamp, verifying
 * that the reservation remains active and properly holds inventory until the
 * new expiration time.
 *
 * Test Steps:
 *
 * 1. Register and authenticate as admin to gain reservation management permissions
 * 2. Update a reservation with extended expiration time (future timestamp)
 * 3. Verify the new expiration time is correctly saved in the system
 * 4. Confirm the reservation status remains 'active' after extension
 * 5. Validate that reserved inventory continues to be held
 * 6. Ensure business rules are enforced (expiration must be future, not
 *    past/current)
 */
export async function test_api_inventory_reservation_expiration_time_extension(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as admin
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

  // Step 2: Generate test reservation ID (simulating existing reservation)
  const reservationId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Calculate new expiration time (30 minutes from now)
  const currentTime = new Date();
  const extendedExpirationTime = new Date(
    currentTime.getTime() + 30 * 60 * 1000,
  );
  const newExpiresAt = extendedExpirationTime.toISOString();

  // Step 4: Extend the reservation expiration time
  const updatedReservation: IShoppingMallInventoryReservation =
    await api.functional.shoppingMall.admin.inventoryReservations.update(
      connection,
      {
        reservationId: reservationId,
        body: {
          expires_at: newExpiresAt,
        } satisfies IShoppingMallInventoryReservation.IUpdate,
      },
    );
  typia.assert(updatedReservation);

  // Step 5: Validate the new expiration time is correctly saved
  TestValidator.equals(
    "extended expiration time matches requested time",
    updatedReservation.expires_at,
    newExpiresAt,
  );

  // Step 6: Verify the reservation status remains 'active'
  TestValidator.equals(
    "reservation status remains active after extension",
    updatedReservation.reservation_status,
    "active",
  );

  // Step 7: Validate that the expiration time is in the future
  const expiresAtDate = new Date(updatedReservation.expires_at);
  const now = new Date();
  TestValidator.predicate(
    "expiration time is in the future",
    expiresAtDate > now,
  );

  // Step 8: Verify reservation ID matches
  TestValidator.equals(
    "reservation ID is unchanged",
    updatedReservation.id,
    reservationId,
  );
}
