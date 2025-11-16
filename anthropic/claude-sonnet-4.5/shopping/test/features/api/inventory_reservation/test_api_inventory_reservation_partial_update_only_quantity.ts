import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallInventoryReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryReservation";

/**
 * Test partial update pattern where only reservation quantity is modified
 * without affecting other fields.
 *
 * This test validates that the inventory reservation update endpoint properly
 * supports partial updates, allowing targeted field modifications without
 * requiring all fields or affecting unchanged fields.
 *
 * Test workflow:
 *
 * 1. Admin authenticates to gain necessary permissions
 * 2. Attempt partial update with ONLY the reserved_quantity field
 * 3. Verify the update succeeds and returns a valid reservation entity
 * 4. Confirm the response includes the updated quantity and complete reservation
 *    data
 *
 * Note: This test validates the partial update pattern itself - that the
 * endpoint accepts requests with only a subset of fields and returns complete,
 * valid reservation data.
 */
export async function test_api_inventory_reservation_partial_update_only_quantity(
  connection: api.IConnection,
) {
  // Step 1: Admin authentication to establish proper permissions
  const adminData = {
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
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Generate reservation ID for the update operation
  const reservationId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Perform partial update - change ONLY the reserved_quantity field
  // This tests that the endpoint accepts partial updates without requiring all fields
  const newQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();

  const partialUpdateBody = {
    reserved_quantity: newQuantity,
  } satisfies IShoppingMallInventoryReservation.IUpdate;

  const updatedReservation: IShoppingMallInventoryReservation =
    await api.functional.shoppingMall.admin.inventoryReservations.update(
      connection,
      {
        reservationId: reservationId,
        body: partialUpdateBody,
      },
    );
  typia.assert(updatedReservation);

  // Step 4: Verify the partial update response structure
  // The response should be a complete reservation entity with the updated quantity
  TestValidator.equals(
    "reservation ID matches request",
    updatedReservation.id,
    reservationId,
  );

  TestValidator.equals(
    "reserved quantity matches updated value",
    updatedReservation.reserved_quantity,
    newQuantity,
  );

  // Step 5: Verify response completeness - all required fields are present
  // typia.assert already validated structure, we just confirm key business fields
  TestValidator.predicate(
    "reservation has valid status",
    ["active", "released", "expired", "converted"].includes(
      updatedReservation.reservation_status,
    ),
  );

  TestValidator.predicate(
    "reservation has SKU reference",
    updatedReservation.shopping_mall_sale_sku_id.length > 0,
  );

  TestValidator.predicate(
    "reservation has buyer reference",
    updatedReservation.shopping_mall_buyer_id.length > 0,
  );
}
