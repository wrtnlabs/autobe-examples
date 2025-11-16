import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallInventoryReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryReservation";

/**
 * Test authenticated buyer retrieval of their own active inventory reservation.
 *
 * This test validates that buyers can successfully retrieve detailed
 * information about their active inventory reservations during the checkout
 * process. It ensures proper authorization, complete data retrieval, and
 * accurate field validation.
 *
 * Test Flow:
 *
 * 1. Register and authenticate as a buyer
 * 2. Retrieve an inventory reservation by ID (using simulation mode)
 * 3. Validate complete reservation data structure via typia.assert()
 * 4. Verify business logic: buyer ownership, active status, no order conversion
 */
export async function test_api_inventory_reservation_buyer_retrieve_own_active(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a buyer
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerData = {
    email: buyerEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    ip: "192.168.1.100",
    href: "https://example.com/register" satisfies string & tags.Format<"uri">,
    referrer: "https://google.com" satisfies string & tags.Format<"uri">,
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer = await api.functional.auth.buyer.join(connection, {
    body: buyerData,
  });
  typia.assert(buyer);

  // Step 2: Retrieve an inventory reservation by ID
  // Generate a random UUID for the reservation ID (simulation mode will return valid data)
  const reservationId = typia.random<string & tags.Format<"uuid">>();

  const retrievedReservation =
    await api.functional.shoppingMall.buyer.inventoryReservations.at(
      connection,
      {
        reservationId: reservationId,
      },
    );

  // Step 3: Complete type validation (validates ALL fields including UUIDs, timestamps, enums, constraints)
  typia.assert(retrievedReservation);

  // Step 4: Business logic validations only
  TestValidator.equals(
    "reservation buyer ID matches authenticated buyer",
    retrievedReservation.shopping_mall_buyer_id,
    buyer.id,
  );

  TestValidator.equals(
    "reservation status is active",
    retrievedReservation.reservation_status,
    "active",
  );

  TestValidator.predicate(
    "active reservation has not been converted to order",
    retrievedReservation.shopping_mall_order_id === null ||
      retrievedReservation.shopping_mall_order_id === undefined,
  );

  TestValidator.predicate(
    "reserved quantity is positive",
    retrievedReservation.reserved_quantity >= 1,
  );
}
