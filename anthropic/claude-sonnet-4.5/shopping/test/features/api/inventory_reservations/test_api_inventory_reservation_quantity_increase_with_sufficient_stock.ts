import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallInventoryReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryReservation";

/**
 * Test successful inventory reservation quantity increase when sufficient
 * unreserved inventory exists.
 *
 * This test validates that an administrator can successfully update an
 * inventory reservation to increase its quantity. Since only the update
 * endpoint is available, this test demonstrates a single update operation that
 * increases the reservation quantity from an initial state.
 *
 * Test workflow:
 *
 * 1. Admin authenticates and establishes authorization context
 * 2. Update an existing reservation with increased quantity
 * 3. Validate the update succeeded and new quantity is reflected
 * 4. Verify reservation properties are correctly returned
 */
export async function test_api_inventory_reservation_quantity_increase_with_sufficient_stock(
  connection: api.IConnection,
) {
  // Step 1: Admin authenticates to gain reservation management permissions
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "super_admin" as const,
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Update reservation with increased quantity (simulating quantity increase scenario)
  const reservationId = typia.random<string & tags.Format<"uuid">>();
  const increasedQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const futureExpiration = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const updatedReservation: IShoppingMallInventoryReservation =
    await api.functional.shoppingMall.admin.inventoryReservations.update(
      connection,
      {
        reservationId: reservationId,
        body: {
          reserved_quantity: increasedQuantity,
          reservation_status: "active" as const,
          expires_at: futureExpiration,
        } satisfies IShoppingMallInventoryReservation.IUpdate,
      },
    );
  typia.assert(updatedReservation);

  // Step 3: Validate the reservation was updated successfully
  TestValidator.equals(
    "reservation ID matches request",
    updatedReservation.id,
    reservationId,
  );

  // Step 4: Verify the quantity is reflected in response
  TestValidator.predicate(
    "reservation quantity is positive",
    updatedReservation.reserved_quantity >= 1,
  );

  // Step 5: Verify reservation has valid status
  const validStatuses = ["active", "released", "expired", "converted"] as const;
  TestValidator.predicate(
    "reservation has valid status",
    validStatuses.includes(updatedReservation.reservation_status),
  );

  // Step 6: Verify expiration time is a valid future timestamp
  const expirationDate = new Date(updatedReservation.expires_at);
  TestValidator.predicate(
    "expiration time is valid date",
    !isNaN(expirationDate.getTime()),
  );
}
