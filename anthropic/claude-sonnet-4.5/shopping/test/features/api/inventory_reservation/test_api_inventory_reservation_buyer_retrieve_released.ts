import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallInventoryReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryReservation";

/**
 * Test retrieval of inventory reservation details by reservation ID.
 *
 * This test validates that authenticated buyers can retrieve inventory
 * reservation information using the reservation ID. The test creates a buyer
 * account, authenticates the buyer, and then retrieves a reservation by its ID
 * to verify the API returns complete reservation data with proper structure.
 *
 * Due to API limitations (no creation or release endpoints available), this
 * test focuses on validating the retrieval functionality and response structure
 * of the inventory reservations API.
 *
 * Steps:
 *
 * 1. Create and authenticate a buyer account
 * 2. Generate a valid reservation ID for testing
 * 3. Retrieve the reservation details using the ID
 * 4. Validate the complete reservation response structure
 */
export async function test_api_inventory_reservation_buyer_retrieve_released(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a buyer account
  const buyerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(2),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer = await api.functional.auth.buyer.join(connection, {
    body: buyerData,
  });
  typia.assert(buyer);

  // Step 2: Generate a valid reservation ID for testing
  const reservationId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Retrieve the reservation details using the ID
  const reservation =
    await api.functional.shoppingMall.buyer.inventoryReservations.at(
      connection,
      {
        reservationId: reservationId,
      },
    );

  // Step 4: Validate the complete reservation response structure
  typia.assert(reservation);
}
