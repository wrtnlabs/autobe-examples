import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryReservation";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallInventoryReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryReservation";

/**
 * Test that administrators can filter inventory reservations by quantity
 * ranges.
 *
 * This validates that the quantity-based filtering parameters
 * (reserved_quantity_min and reserved_quantity_max) work correctly in the
 * inventory reservation search API. The test verifies that:
 *
 * 1. The minimum quantity filter returns only reservations with quantities >= the
 *    specified value
 * 2. The maximum quantity filter returns only reservations with quantities <= the
 *    specified value
 * 3. Both filters can be combined to create a quantity range
 * 4. The filters work independently when used alone
 *
 * This functionality helps administrators identify large or small inventory
 * holds for analysis.
 */
export async function test_api_inventory_reservation_admin_filter_by_quantity_range(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and authenticate
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Query all reservations to establish baseline
  const allReservationsPage =
    await api.functional.shoppingMall.admin.inventoryReservations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallInventoryReservation.IRequest,
      },
    );
  typia.assert(allReservationsPage);

  // Step 3: Test minimum quantity filter - find reservations with at least 5 items
  const minQuantityFilter = 5;
  const minQuantityPage =
    await api.functional.shoppingMall.admin.inventoryReservations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          reserved_quantity_min: minQuantityFilter,
        } satisfies IShoppingMallInventoryReservation.IRequest,
      },
    );
  typia.assert(minQuantityPage);

  // Validate that all returned reservations meet minimum quantity requirement
  for (const reservation of minQuantityPage.data) {
    TestValidator.predicate(
      "reservation quantity meets minimum requirement",
      reservation.reserved_quantity >= minQuantityFilter,
    );
  }

  // Step 4: Test maximum quantity filter - find reservations with at most 20 items
  const maxQuantityFilter = 20;
  const maxQuantityPage =
    await api.functional.shoppingMall.admin.inventoryReservations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          reserved_quantity_max: maxQuantityFilter,
        } satisfies IShoppingMallInventoryReservation.IRequest,
      },
    );
  typia.assert(maxQuantityPage);

  // Validate that all returned reservations meet maximum quantity requirement
  for (const reservation of maxQuantityPage.data) {
    TestValidator.predicate(
      "reservation quantity meets maximum requirement",
      reservation.reserved_quantity <= maxQuantityFilter,
    );
  }

  // Step 5: Test combined min and max filters - find reservations between 5 and 20 items
  const combinedPage =
    await api.functional.shoppingMall.admin.inventoryReservations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          reserved_quantity_min: minQuantityFilter,
          reserved_quantity_max: maxQuantityFilter,
        } satisfies IShoppingMallInventoryReservation.IRequest,
      },
    );
  typia.assert(combinedPage);

  // Validate that all returned reservations meet both minimum and maximum requirements
  for (const reservation of combinedPage.data) {
    TestValidator.predicate(
      "reservation quantity is within range",
      reservation.reserved_quantity >= minQuantityFilter &&
        reservation.reserved_quantity <= maxQuantityFilter,
    );
  }

  // Step 6: Test edge case - filter for large reservations (100+ items)
  const largeQuantityMin = 100;
  const largeQuantityPage =
    await api.functional.shoppingMall.admin.inventoryReservations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          reserved_quantity_min: largeQuantityMin,
        } satisfies IShoppingMallInventoryReservation.IRequest,
      },
    );
  typia.assert(largeQuantityPage);

  // Validate large quantity filter results
  for (const reservation of largeQuantityPage.data) {
    TestValidator.predicate(
      "large reservation quantity meets minimum",
      reservation.reserved_quantity >= largeQuantityMin,
    );
  }
}
