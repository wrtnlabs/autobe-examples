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
 * Test that administrators can retrieve a paginated list of all active
 * inventory reservations.
 *
 * This test validates the admin's ability to monitor current inventory holds
 * system-wide, which is critical for inventory management and oversight. The
 * test creates an admin account, then queries the inventory reservation
 * endpoint filtering by reservation_status='active' to verify proper pagination
 * and that only active reservations are returned.
 *
 * Workflow:
 *
 * 1. Create and authenticate as admin user with platform-wide access
 * 2. Query the admin endpoint filtering by reservation_status='active' with
 *    pagination
 * 3. Validate pagination metadata (current page, limit, total records, total
 *    pages)
 * 4. Verify all returned reservations have status='active'
 * 5. Validate complete type safety of response using typia.assert()
 */
export async function test_api_inventory_reservation_admin_search_all_active(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as admin user
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: RandomGenerator.pick([
      "super_admin",
      "moderator",
      "support",
    ] as const),
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Query all active inventory reservations with pagination
  const searchRequest = {
    page: 1,
    limit: 10,
    reservation_status: "active" as const,
  } satisfies IShoppingMallInventoryReservation.IRequest;

  const searchResult =
    await api.functional.shoppingMall.admin.inventoryReservations.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(searchResult);

  // Step 3: Validate pagination metadata
  const pagination = searchResult.pagination;
  typia.assert(pagination);

  TestValidator.equals("current page matches request", pagination.current, 1);

  TestValidator.equals("limit matches request", pagination.limit, 10);

  TestValidator.predicate(
    "records count is non-negative",
    pagination.records >= 0,
  );

  TestValidator.predicate("pages count is non-negative", pagination.pages >= 0);

  // Step 4: Validate that all returned reservations have status='active'
  for (const reservation of searchResult.data) {
    typia.assert(reservation);

    TestValidator.equals(
      "reservation status is active",
      reservation.reservation_status,
      "active",
    );

    TestValidator.predicate(
      "reserved quantity is positive",
      reservation.reserved_quantity >= 1,
    );
  }
}
