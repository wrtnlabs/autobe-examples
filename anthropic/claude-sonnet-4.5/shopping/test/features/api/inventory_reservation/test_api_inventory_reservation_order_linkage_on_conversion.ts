import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallInventoryReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryReservation";

/**
 * Test linking a reservation to an order when converting it to a completed
 * sale.
 *
 * This test validates the critical business flow where an active inventory
 * reservation is converted to a completed sale by linking it to an order. The
 * test ensures that:
 *
 * 1. Admin can update a reservation with a valid order ID
 * 2. The reservation status transitions to 'converted'
 * 3. The order linkage is properly established in the database
 * 4. Converted reservations maintain referential integrity
 *
 * Business Context: When a buyer completes checkout and payment is confirmed,
 * the temporary inventory hold (reservation) must be converted to a final sale
 * and linked to the created order. This linkage is essential for inventory
 * auditing, tracking the complete buyer journey from cart to order fulfillment,
 * and maintaining data integrity between reservations and orders.
 *
 * Test Flow:
 *
 * 1. Authenticate as admin to gain reservation management permissions
 * 2. Update a reservation with order ID and 'converted' status
 * 3. Verify the order linkage is saved correctly
 * 4. Confirm the reservation status is 'converted'
 * 5. Validate the reservation-order relationship is established
 */
export async function test_api_inventory_reservation_order_linkage_on_conversion(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Generate a valid order ID to link to the reservation
  const orderId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Simulate an existing reservation ID (in real scenario, this would come from a prior reservation creation)
  const reservationId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Update the reservation to link it to the order and convert status
  const updateData = {
    shopping_mall_order_id: orderId,
    reservation_status: "converted" as const,
  } satisfies IShoppingMallInventoryReservation.IUpdate;

  const convertedReservation =
    await api.functional.shoppingMall.admin.inventoryReservations.update(
      connection,
      {
        reservationId: reservationId,
        body: updateData,
      },
    );
  typia.assert(convertedReservation);

  // Step 5: Validate the order linkage is established
  TestValidator.equals(
    "reservation should be linked to order",
    convertedReservation.shopping_mall_order_id,
    orderId,
  );

  // Step 6: Validate the reservation status is converted
  TestValidator.equals(
    "reservation status should be converted",
    convertedReservation.reservation_status,
    "converted",
  );

  // Step 7: Verify the reservation has all required fields properly set
  TestValidator.predicate(
    "reservation ID should be valid UUID",
    typia.is<string & tags.Format<"uuid">>(convertedReservation.id),
  );

  TestValidator.predicate(
    "reservation should have SKU ID",
    typia.is<string & tags.Format<"uuid">>(
      convertedReservation.shopping_mall_sale_sku_id,
    ),
  );

  TestValidator.predicate(
    "reservation should have buyer ID",
    typia.is<string & tags.Format<"uuid">>(
      convertedReservation.shopping_mall_buyer_id,
    ),
  );

  TestValidator.predicate(
    "reserved quantity should be positive",
    convertedReservation.reserved_quantity >= 1,
  );
}
