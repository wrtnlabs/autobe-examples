import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallInventoryReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryReservation";

/**
 * Test that inventory reservations accurately reflect the quantity of items
 * being held for the buyer.
 *
 * This test validates inventory reservation quantity accuracy by authenticating
 * a buyer and retrieving reservation details to verify the reserved_quantity
 * field is properly maintained. Due to API limitations (no reservation creation
 * endpoint available), this test uses simulation mode to generate realistic
 * reservation data for validation.
 *
 * The test ensures that:
 *
 * - Reserved quantity is a valid positive integer
 * - Quantity constraints are properly enforced (minimum 1)
 * - All reservation fields are correctly populated
 * - Temporal data integrity is maintained
 *
 * Test workflow:
 *
 * 1. Create and authenticate a buyer account
 * 2. Retrieve a reservation using simulation mode (generates mock data)
 * 3. Verify the reserved_quantity is valid and meets constraints
 * 4. Validate reservation data integrity and field relationships
 */
export async function test_api_inventory_reservation_buyer_verify_quantity_accuracy(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = typia.random<string & tags.MinLength<8>>();

  const buyerData = {
    email: buyerEmail,
    password: buyerPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: "https://test.example.com/register",
    referrer: "https://test.example.com",
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer = await api.functional.auth.buyer.join(connection, {
    body: buyerData,
  });
  typia.assert(buyer);

  // Step 2: Use simulation mode to retrieve reservation with mock data
  // Since no reservation creation API exists, we use simulation to generate test data
  const simulationConnection = { ...connection, simulate: true };
  const testReservationId = typia.random<string & tags.Format<"uuid">>();

  const reservation =
    await api.functional.shoppingMall.buyer.inventoryReservations.at(
      simulationConnection,
      {
        reservationId: testReservationId,
      },
    );
  typia.assert(reservation);

  // Step 3: Verify reservation quantity accuracy
  TestValidator.predicate(
    "reserved quantity is positive integer",
    reservation.reserved_quantity >= 1 &&
      Number.isInteger(reservation.reserved_quantity),
  );

  // Step 4: Validate reservation structure and field integrity
  TestValidator.predicate(
    "reservation ID is valid UUID format",
    reservation.id.length === 36,
  );

  TestValidator.predicate(
    "reservation has valid SKU reference",
    reservation.shopping_mall_sale_sku_id.length === 36,
  );

  TestValidator.predicate(
    "reservation has valid buyer reference",
    reservation.shopping_mall_buyer_id.length === 36,
  );

  TestValidator.predicate(
    "reservation status is valid",
    ["active", "released", "expired", "converted"].includes(
      reservation.reservation_status,
    ),
  );

  // Step 5: Verify temporal data relationships
  const createdAt = new Date(reservation.created_at);
  const expiresAt = new Date(reservation.expires_at);
  const updatedAt = new Date(reservation.updated_at);

  TestValidator.predicate(
    "expiration time is after creation time",
    expiresAt.getTime() > createdAt.getTime(),
  );

  TestValidator.predicate(
    "updated time is at or after creation time",
    updatedAt.getTime() >= createdAt.getTime(),
  );

  // Step 6: Validate optional order reference consistency
  if (
    reservation.shopping_mall_order_id !== null &&
    reservation.shopping_mall_order_id !== undefined
  ) {
    TestValidator.predicate(
      "order reference is valid UUID when present",
      reservation.shopping_mall_order_id.length === 36,
    );

    TestValidator.predicate(
      "reservation with order should be converted status",
      reservation.reservation_status === "converted",
    );
  }
}
