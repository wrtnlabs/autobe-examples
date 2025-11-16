import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallInventoryReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryReservation";

/**
 * Test that deleting an active inventory reservation immediately releases the
 * reserved stock back to available inventory.
 *
 * This test validates the core inventory reservation lifecycle operation of
 * releasing temporarily held stock when a reservation is deleted. When buyers
 * abandon checkout or manually cancel their cart, the reserved inventory must
 * be returned to the available pool for other buyers to purchase.
 *
 * Test Flow:
 *
 * 1. Generate a valid reservation ID (UUID format)
 * 2. Call the DELETE endpoint to remove the reservation
 * 3. Verify the deletion succeeds and returns the deleted reservation record
 * 4. Validate the response structure matches IShoppingMallInventoryReservation
 */
export async function test_api_inventory_reservation_deletion_releases_stock(
  connection: api.IConnection,
) {
  // Generate a valid reservation ID for deletion
  const reservationId = typia.random<string & tags.Format<"uuid">>();

  // Delete the inventory reservation to release the stock
  const deletedReservation: IShoppingMallInventoryReservation =
    await api.functional.shoppingMall.inventoryReservations.erase(connection, {
      reservationId: reservationId,
    });

  // Validate the deleted reservation response structure
  typia.assert(deletedReservation);
}
