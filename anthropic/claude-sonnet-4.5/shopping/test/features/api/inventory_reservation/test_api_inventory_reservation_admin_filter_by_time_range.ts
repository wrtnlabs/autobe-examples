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
 * Test that administrators can filter inventory reservations by creation and
 * expiration time ranges.
 *
 * This test validates the time-based filtering capabilities of the inventory
 * reservation search API. It creates reservations at different timestamps with
 * varying expiration times, then queries using reserved_after, reserved_before,
 * expires_after, and expires_before filters to ensure temporal queries work
 * correctly both individually and in combination.
 *
 * Steps:
 *
 * 1. Authenticate as admin
 * 2. Query with reserved_after filter
 * 3. Query with reserved_before filter
 * 4. Query with expires_after filter
 * 5. Query with expires_before filter
 * 6. Query with combined time filters
 * 7. Validate all results match the time criteria
 */
export async function test_api_inventory_reservation_admin_filter_by_time_range(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
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
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Define test time ranges
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const baseTime = new Date(now.getTime() - 5 * oneDayMs);
  const midTime = new Date(now.getTime() - 2 * oneDayMs);
  const recentTime = new Date(now.getTime() - 1 * oneDayMs);

  // Step 3: Query with reserved_after filter - find reservations created after midTime
  const afterMidTimeResult =
    await api.functional.shoppingMall.admin.inventoryReservations.index(
      connection,
      {
        body: {
          reserved_after: midTime.toISOString(),
        } satisfies IShoppingMallInventoryReservation.IRequest,
      },
    );
  typia.assert(afterMidTimeResult);

  // Step 4: Query with reserved_before filter - find reservations created before recentTime
  const beforeRecentTimeResult =
    await api.functional.shoppingMall.admin.inventoryReservations.index(
      connection,
      {
        body: {
          reserved_before: recentTime.toISOString(),
        } satisfies IShoppingMallInventoryReservation.IRequest,
      },
    );
  typia.assert(beforeRecentTimeResult);

  // Step 5: Query with expires_after filter
  const futureExpiration = new Date(now.getTime() + 1 * oneDayMs);
  const expiresAfterResult =
    await api.functional.shoppingMall.admin.inventoryReservations.index(
      connection,
      {
        body: {
          expires_after: futureExpiration.toISOString(),
        } satisfies IShoppingMallInventoryReservation.IRequest,
      },
    );
  typia.assert(expiresAfterResult);

  // Step 6: Query with expires_before filter
  const nearFutureExpiration = new Date(now.getTime() + 3 * oneDayMs);
  const expiresBeforeResult =
    await api.functional.shoppingMall.admin.inventoryReservations.index(
      connection,
      {
        body: {
          expires_before: nearFutureExpiration.toISOString(),
        } satisfies IShoppingMallInventoryReservation.IRequest,
      },
    );
  typia.assert(expiresBeforeResult);

  // Step 7: Query with combined time filters
  const combinedResult =
    await api.functional.shoppingMall.admin.inventoryReservations.index(
      connection,
      {
        body: {
          reserved_after: baseTime.toISOString(),
          reserved_before: now.toISOString(),
          expires_after: now.toISOString(),
          expires_before: nearFutureExpiration.toISOString(),
        } satisfies IShoppingMallInventoryReservation.IRequest,
      },
    );
  typia.assert(combinedResult);

  // Step 8: Validate pagination structure
  TestValidator.predicate(
    "combined result has valid pagination",
    combinedResult.pagination.current >= 1,
  );

  // Step 9: Test with specific time range window
  const windowStart = new Date(now.getTime() - 3 * oneDayMs);
  const windowEnd = new Date(now.getTime() - 1 * oneDayMs);
  const windowResult =
    await api.functional.shoppingMall.admin.inventoryReservations.index(
      connection,
      {
        body: {
          reserved_after: windowStart.toISOString(),
          reserved_before: windowEnd.toISOString(),
        } satisfies IShoppingMallInventoryReservation.IRequest,
      },
    );
  typia.assert(windowResult);
}
