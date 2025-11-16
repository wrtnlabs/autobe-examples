import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallInventoryReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryReservation";

/**
 * Test that buyers can retrieve details of reservations that have expired due
 * to timeout.
 *
 * This test validates the structure and accessibility of expired inventory
 * reservation data for authenticated buyers. It demonstrates that buyers can
 * access expired reservation information to understand checkout failures.
 *
 * Test Flow:
 *
 * 1. Create and authenticate a buyer account
 * 2. Use simulation mode to generate an expired reservation response
 * 3. Retrieve the reservation details using the buyer's authentication
 * 4. Validate that reservation_status is 'expired'
 * 5. Validate that shopping_mall_order_id is null (no order was created)
 *
 * Note: This test uses simulation mode because the APIs to create sales, SKUs,
 * and inventory reservations are not available in the provided materials.
 */
export async function test_api_inventory_reservation_buyer_retrieve_expired(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as a buyer
  const buyerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: "https://shop.example.com/checkout",
    referrer: "https://shop.example.com/cart",
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer = await api.functional.auth.buyer.join(connection, {
    body: buyerData,
  });
  typia.assert(buyer);

  // Step 2: Create a simulation connection to generate mock expired reservation
  const simulationConnection: api.IConnection = {
    ...connection,
    simulate: true,
  };

  // Step 3: Generate a reservation ID
  const reservationId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Retrieve the reservation using simulation mode
  const reservation =
    await api.functional.shoppingMall.buyer.inventoryReservations.at(
      simulationConnection,
      {
        reservationId: reservationId,
      },
    );
  typia.assert(reservation);

  // Step 5: Validate reservation status is 'expired'
  TestValidator.equals(
    "reservation status should be expired",
    reservation.reservation_status,
    "expired",
  );

  // Step 6: Validate no order was created (shopping_mall_order_id is null)
  TestValidator.equals(
    "no order should be created for expired reservation",
    reservation.shopping_mall_order_id,
    null,
  );
}
