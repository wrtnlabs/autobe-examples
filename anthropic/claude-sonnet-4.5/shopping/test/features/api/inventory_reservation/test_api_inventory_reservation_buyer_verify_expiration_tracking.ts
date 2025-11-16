import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallInventoryReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryReservation";

/**
 * Test buyer's ability to track reservation expiration times for checkout
 * countdown timers.
 *
 * This test validates that buyers can retrieve their inventory reservations and
 * accurately track when those reservations will expire. The expiration
 * timestamp enables buyers to implement countdown timers in the UI, showing how
 * much time remains to complete checkout before the reserved inventory is
 * released back to available stock.
 *
 * Test flow:
 *
 * 1. Create and authenticate a buyer account
 * 2. Generate a mock reservation ID (simulating a created reservation)
 * 3. Retrieve the reservation details using the buyer's credentials
 * 4. Verify the expiration time is in the future (reasonable checkout window)
 * 5. Confirm the expiration window is appropriate (typically 10-30 minutes)
 * 6. Verify the reservation status is active
 */
export async function test_api_inventory_reservation_buyer_verify_expiration_tracking(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as a buyer
  const buyerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer = await api.functional.auth.buyer.join(connection, {
    body: buyerData,
  });
  typia.assert(buyer);

  // Step 2: Generate a reservation ID to retrieve
  // In a real scenario, this would be created via a reservation creation endpoint
  // For this test, we're using the SDK's simulation mode to generate mock data
  const reservationId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Retrieve the reservation details
  const reservation =
    await api.functional.shoppingMall.buyer.inventoryReservations.at(
      connection,
      {
        reservationId: reservationId,
      },
    );
  typia.assert(reservation);

  // Step 4: Validate the expiration time is in the future
  const now = new Date();
  const expiresAt = new Date(reservation.expires_at);

  TestValidator.predicate(
    "expiration time must be in the future",
    expiresAt > now,
  );

  // Step 5: Verify the expiration window is reasonable (10-30 minutes from creation)
  const createdAt = new Date(reservation.created_at);
  const expirationWindowMinutes =
    (expiresAt.getTime() - createdAt.getTime()) / (1000 * 60);

  TestValidator.predicate(
    "expiration window should be between 10 and 30 minutes",
    expirationWindowMinutes >= 10 && expirationWindowMinutes <= 30,
  );

  // Step 6: Verify the reservation status is active (not expired)
  TestValidator.equals(
    "reservation status should be active",
    reservation.reservation_status,
    "active",
  );
}
