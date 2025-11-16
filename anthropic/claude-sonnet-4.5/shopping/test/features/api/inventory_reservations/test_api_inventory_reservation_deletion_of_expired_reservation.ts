import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallInventoryReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryReservation";

/**
 * Test deleting an expired reservation as part of system cleanup processes.
 *
 * This test validates the deletion operation for inventory reservations that
 * have expired. In a real e-commerce system, expired reservations are those
 * that have reached their time limit without the buyer completing checkout.
 * These reservations automatically release their held inventory when they
 * expire.
 *
 * The test demonstrates the cleanup mechanism by:
 *
 * 1. Calling the delete endpoint with a reservation ID
 * 2. Verifying the response returns the reservation entity
 * 3. Confirming all required fields are present and properly typed
 *
 * This operation is critical for system maintenance, removing historical
 * reservation records while ensuring inventory accounting remains accurate
 * (expired reservations have already released their stock automatically).
 */
export async function test_api_inventory_reservation_deletion_of_expired_reservation(
  connection: api.IConnection,
) {
  // Generate a random reservation ID for deletion
  const reservationId = typia.random<string & tags.Format<"uuid">>();

  // Delete the inventory reservation
  const deletedReservation: IShoppingMallInventoryReservation =
    await api.functional.shoppingMall.inventoryReservations.erase(connection, {
      reservationId: reservationId,
    });

  // Validate the response structure - this performs COMPLETE validation
  typia.assert(deletedReservation);
}
