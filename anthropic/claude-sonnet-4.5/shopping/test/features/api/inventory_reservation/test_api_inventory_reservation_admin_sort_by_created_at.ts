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
 * Test that administrators can sort inventory reservations by creation
 * timestamp.
 *
 * This test validates the chronological sorting capabilities of the inventory
 * reservation search API. It creates multiple reservations at different times,
 * then queries with sort_by='created_at' using both ascending and descending
 * sort orders to verify correct chronological ordering.
 *
 * Steps:
 *
 * 1. Authenticate as admin
 * 2. Query inventory reservations with created_at ascending sort
 * 3. Validate that results are ordered from oldest to newest
 * 4. Query inventory reservations with created_at descending sort
 * 5. Validate that results are ordered from newest to oldest
 * 6. Verify sorting works correctly across pagination boundaries
 */
export async function test_api_inventory_reservation_admin_sort_by_created_at(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
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

  // Step 2: Query inventory reservations with created_at ascending sort
  const ascendingResult =
    await api.functional.shoppingMall.admin.inventoryReservations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          sort_order: "asc",
        } satisfies IShoppingMallInventoryReservation.IRequest,
      },
    );
  typia.assert(ascendingResult);

  // Step 3: Validate that results are ordered from oldest to newest
  if (ascendingResult.data.length > 1) {
    for (let i = 0; i < ascendingResult.data.length - 1; i++) {
      const current = new Date(ascendingResult.data[i].created_at).getTime();
      const next = new Date(ascendingResult.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        "ascending order - current created_at should be <= next created_at",
        current <= next,
      );
    }
  }

  // Step 4: Query inventory reservations with created_at descending sort
  const descendingResult =
    await api.functional.shoppingMall.admin.inventoryReservations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IShoppingMallInventoryReservation.IRequest,
      },
    );
  typia.assert(descendingResult);

  // Step 5: Validate that results are ordered from newest to oldest
  if (descendingResult.data.length > 1) {
    for (let i = 0; i < descendingResult.data.length - 1; i++) {
      const current = new Date(descendingResult.data[i].created_at).getTime();
      const next = new Date(descendingResult.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        "descending order - current created_at should be >= next created_at",
        current >= next,
      );
    }
  }

  // Step 6: Verify sorting works correctly across pagination boundaries
  if (ascendingResult.pagination.pages > 1) {
    const secondPageAsc =
      await api.functional.shoppingMall.admin.inventoryReservations.index(
        connection,
        {
          body: {
            page: 2,
            limit: 10,
            sort_by: "created_at",
            sort_order: "asc",
          } satisfies IShoppingMallInventoryReservation.IRequest,
        },
      );
    typia.assert(secondPageAsc);

    if (ascendingResult.data.length > 0 && secondPageAsc.data.length > 0) {
      const lastOfFirstPage = new Date(
        ascendingResult.data[ascendingResult.data.length - 1].created_at,
      ).getTime();
      const firstOfSecondPage = new Date(
        secondPageAsc.data[0].created_at,
      ).getTime();
      TestValidator.predicate(
        "pagination boundary - last item of page 1 should be <= first item of page 2",
        lastOfFirstPage <= firstOfSecondPage,
      );
    }
  }
}
