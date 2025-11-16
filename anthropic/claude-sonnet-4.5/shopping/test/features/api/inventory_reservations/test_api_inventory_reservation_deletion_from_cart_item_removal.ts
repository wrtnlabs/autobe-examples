import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallInventoryReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryReservation";

/**
 * Test deleting an inventory reservation when a buyer removes items from cart.
 *
 * This test validates the deletion of an inventory reservation that was created
 * to hold product inventory during the checkout process. When a buyer removes
 * items from their cart before completing checkout, the corresponding
 * reservation must be deleted to release the temporarily held stock back to
 * available inventory.
 *
 * Test workflow:
 *
 * 1. Generate a reservation ID (simulating an existing cart item reservation)
 * 2. Delete the reservation via the DELETE endpoint
 * 3. Validate the response contains complete reservation data
 * 4. Verify all required fields are present and properly typed
 */
export async function test_api_inventory_reservation_deletion_from_cart_item_removal(
  connection: api.IConnection,
) {
  // Generate a random reservation ID to simulate an existing reservation
  const reservationId = typia.random<string & tags.Format<"uuid">>();

  // Delete the inventory reservation
  const deletedReservation: IShoppingMallInventoryReservation =
    await api.functional.shoppingMall.inventoryReservations.erase(connection, {
      reservationId,
    });

  // Validate the response structure and type compliance
  typia.assert(deletedReservation);
}
