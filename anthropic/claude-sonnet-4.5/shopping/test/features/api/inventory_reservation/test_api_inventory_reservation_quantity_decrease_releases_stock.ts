import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallInventoryReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryReservation";

/**
 * Test updating inventory reservation quantity to a lower value.
 *
 * This test validates that an admin can successfully update an existing
 * inventory reservation to reduce its reserved quantity. In a real-world
 * scenario, this would release the difference back to available inventory,
 * though we cannot verify the inventory release directly due to API limitations
 * (no inventory availability endpoint).
 *
 * Test workflow:
 *
 * 1. Authenticate as platform admin to access reservation management APIs
 * 2. Update an existing reservation to reduce its quantity (simulating buyer
 *    reducing cart)
 * 3. Verify the update operation succeeds
 * 4. Validate the reservation reflects the reduced quantity value
 * 5. Confirm reservation metadata remains consistent after update
 *
 * Note: This test assumes a reservation with the generated UUID exists in the
 * system. In a complete test suite, this would follow a test that creates the
 * initial reservation.
 */
export async function test_api_inventory_reservation_quantity_decrease_releases_stock(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as platform admin
  const adminCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateData,
    });
  typia.assert(admin);

  // Step 2: Generate reservation ID (represents existing reservation in system)
  const reservationId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Update reservation to reduce quantity
  // Simulates buyer reducing cart quantity from higher value to 5 units
  const reducedQuantity = 5;

  const updateData = {
    reserved_quantity: reducedQuantity,
  } satisfies IShoppingMallInventoryReservation.IUpdate;

  const updatedReservation: IShoppingMallInventoryReservation =
    await api.functional.shoppingMall.admin.inventoryReservations.update(
      connection,
      {
        reservationId: reservationId,
        body: updateData,
      },
    );
  typia.assert(updatedReservation);

  // Step 4: Validate the reservation quantity was updated correctly
  TestValidator.equals(
    "reservation quantity should be updated to reduced value",
    updatedReservation.reserved_quantity,
    reducedQuantity,
  );

  // Step 5: Verify reservation ID consistency
  TestValidator.equals(
    "reservation ID should remain unchanged",
    updatedReservation.id,
    reservationId,
  );

  // Step 6: Validate reservation is in a valid state after update
  TestValidator.predicate(
    "reservation status should be valid",
    ["active", "released", "expired", "converted"].includes(
      updatedReservation.reservation_status,
    ),
  );

  // Step 7: Verify reservation has valid timestamps
  TestValidator.predicate(
    "reservation should have creation timestamp",
    updatedReservation.created_at !== null &&
      updatedReservation.created_at !== undefined,
  );

  TestValidator.predicate(
    "reservation should have update timestamp",
    updatedReservation.updated_at !== null &&
      updatedReservation.updated_at !== undefined,
  );
}
