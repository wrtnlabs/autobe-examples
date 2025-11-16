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
 * Test admin filtering of inventory reservations by specific SKU ID.
 *
 * This test validates that administrators can filter inventory reservations by
 * a specific SKU ID to monitor which products have active holds. This enables
 * product-specific inventory tracking and helps admins understand current
 * demand and inventory commitment for specific product variants.
 *
 * Test Flow:
 *
 * 1. Create and authenticate as admin user
 * 2. Query all reservations without filters to establish baseline
 * 3. Query reservations filtered by a specific SKU ID
 * 4. Validate response structure and filtering behavior
 * 5. Test with multiple different SKU ID filters
 * 6. Confirm SKU-level inventory monitoring API works correctly
 */
export async function test_api_inventory_reservation_admin_filter_by_sku(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
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

  // Step 2: Query all reservations without SKU filter to get baseline data
  const allReservations: IPageIShoppingMallInventoryReservation =
    await api.functional.shoppingMall.admin.inventoryReservations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallInventoryReservation.IRequest,
      },
    );
  typia.assert(allReservations);

  // Step 3: Validate pagination structure
  TestValidator.predicate(
    "pagination should have valid structure",
    allReservations.pagination.current >= 0 &&
      allReservations.pagination.limit > 0 &&
      allReservations.pagination.records >= 0 &&
      allReservations.pagination.pages >= 0,
  );

  // Step 4: If reservations exist, test SKU filtering with actual SKU IDs
  if (allReservations.data.length > 0) {
    const firstReservation = allReservations.data[0];
    typia.assert(firstReservation);
    const targetSkuId = firstReservation.shopping_mall_sale_sku_id;

    // Query reservations filtered by the specific SKU ID
    const filteredResult: IPageIShoppingMallInventoryReservation =
      await api.functional.shoppingMall.admin.inventoryReservations.index(
        connection,
        {
          body: {
            shopping_mall_sale_sku_id: targetSkuId,
            page: 1,
            limit: 50,
          } satisfies IShoppingMallInventoryReservation.IRequest,
        },
      );
    typia.assert(filteredResult);

    // Validate that all returned reservations match the target SKU
    TestValidator.predicate(
      "filtered result should contain at least the original reservation",
      filteredResult.data.length > 0,
    );

    for (const reservation of filteredResult.data) {
      TestValidator.equals(
        "reservation SKU ID should match filter",
        reservation.shopping_mall_sale_sku_id,
        targetSkuId,
      );
    }

    // Verify filtered count is less than or equal to total count
    TestValidator.predicate(
      "filtered reservations should be subset of all reservations",
      filteredResult.pagination.records <= allReservations.pagination.records,
    );
  }

  // Step 5: Test filtering with a random SKU ID (likely to return empty results)
  const randomSkuId = typia.random<string & tags.Format<"uuid">>();
  const randomSkuResult: IPageIShoppingMallInventoryReservation =
    await api.functional.shoppingMall.admin.inventoryReservations.index(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: randomSkuId,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallInventoryReservation.IRequest,
      },
    );
  typia.assert(randomSkuResult);

  // Validate that random SKU filter works even if no results
  for (const reservation of randomSkuResult.data) {
    TestValidator.equals(
      "random SKU filter should only return matching reservations",
      reservation.shopping_mall_sale_sku_id,
      randomSkuId,
    );
  }

  // Step 6: Test filtering with null SKU ID (should return all reservations)
  const nullSkuResult: IPageIShoppingMallInventoryReservation =
    await api.functional.shoppingMall.admin.inventoryReservations.index(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: null,
          page: 1,
          limit: 50,
        } satisfies IShoppingMallInventoryReservation.IRequest,
      },
    );
  typia.assert(nullSkuResult);

  TestValidator.predicate(
    "null SKU filter should work without errors",
    nullSkuResult.pagination.records >= 0,
  );
}
