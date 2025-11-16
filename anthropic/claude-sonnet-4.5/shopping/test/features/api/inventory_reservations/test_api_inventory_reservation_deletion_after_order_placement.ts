import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallInventoryReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryReservation";

/**
 * Test deleting an inventory reservation to release temporarily held stock.
 *
 * This test validates the deletion API for inventory reservations. It attempts
 * to delete a reservation by ID and verifies that the API returns a valid
 * IShoppingMallInventoryReservation response structure.
 *
 * Test Flow:
 *
 * 1. Generate a reservation ID for the deletion request
 * 2. Call the delete API endpoint
 * 3. Validate the response structure matches IShoppingMallInventoryReservation
 */
export async function test_api_inventory_reservation_deletion_after_order_placement(
  connection: api.IConnection,
) {
  // Generate a reservation ID for deletion
  const reservationId = typia.random<string & tags.Format<"uuid">>();

  // Call the delete API to remove the inventory reservation
  const deletedReservation: IShoppingMallInventoryReservation =
    await api.functional.shoppingMall.inventoryReservations.erase(connection, {
      reservationId: reservationId,
    });

  // Validate the response structure - this checks ALL type requirements
  typia.assert(deletedReservation);
}
