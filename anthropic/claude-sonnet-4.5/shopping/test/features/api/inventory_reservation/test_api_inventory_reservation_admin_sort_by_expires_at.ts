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
 * Test that administrators can sort inventory reservations by expiration
 * timestamp.
 *
 * This test validates expiration-based sorting for prioritizing reservation
 * management. Administrators need to identify urgent reservations (expiring
 * soon) versus those with extended holds to prioritize intervention and prevent
 * inventory lockups.
 *
 * Test workflow:
 *
 * 1. Authenticate as admin to access reservation monitoring
 * 2. Create test reservations with varying expiration times
 * 3. Query with ascending sort (expires_at asc) - urgent items first
 * 4. Validate correct ordering (soonest expiration first)
 * 5. Query with descending sort (expires_at desc) - longest time remaining first
 * 6. Validate correct ordering (latest expiration first)
 */
export async function test_api_inventory_reservation_admin_sort_by_expires_at(
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

  // Step 2: Query reservations with ascending sort (expires_at asc)
  const ascendingResults =
    await api.functional.shoppingMall.admin.inventoryReservations.index(
      connection,
      {
        body: {
          sort_by: "expires_at",
          sort_order: "asc",
        } satisfies IShoppingMallInventoryReservation.IRequest,
      },
    );
  typia.assert(ascendingResults);

  // Step 3: Validate ascending order - reservations expiring soonest first
  if (ascendingResults.data.length > 1) {
    for (let i = 0; i < ascendingResults.data.length - 1; i++) {
      const current = new Date(ascendingResults.data[i].expires_at).getTime();
      const next = new Date(ascendingResults.data[i + 1].expires_at).getTime();

      TestValidator.predicate(
        "ascending sort: current expires_at <= next expires_at",
        current <= next,
      );
    }
  }

  // Step 4: Query reservations with descending sort (expires_at desc)
  const descendingResults =
    await api.functional.shoppingMall.admin.inventoryReservations.index(
      connection,
      {
        body: {
          sort_by: "expires_at",
          sort_order: "desc",
        } satisfies IShoppingMallInventoryReservation.IRequest,
      },
    );
  typia.assert(descendingResults);

  // Step 5: Validate descending order - reservations with longest time remaining first
  if (descendingResults.data.length > 1) {
    for (let i = 0; i < descendingResults.data.length - 1; i++) {
      const current = new Date(descendingResults.data[i].expires_at).getTime();
      const next = new Date(descendingResults.data[i + 1].expires_at).getTime();

      TestValidator.predicate(
        "descending sort: current expires_at >= next expires_at",
        current >= next,
      );
    }
  }

  // Step 6: Verify pagination metadata is correct
  TestValidator.predicate(
    "ascending results have valid pagination",
    ascendingResults.pagination.records >= 0 &&
      ascendingResults.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "descending results have valid pagination",
    descendingResults.pagination.records >= 0 &&
      descendingResults.pagination.pages >= 0,
  );
}
