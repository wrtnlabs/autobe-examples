import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryReservation";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryReservation";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller's ability to monitor active inventory reservations for their
 * products.
 *
 * This test validates the inventory reservation monitoring functionality that
 * enables sellers to track temporary inventory holds created during buyer
 * checkout processes.
 *
 * The test workflow:
 *
 * 1. Create and authenticate seller account
 * 2. Create and authenticate admin account for category creation
 * 3. Admin creates product category
 * 4. Seller creates product sale listing
 * 5. Seller creates SKU variant
 * 6. Seller queries inventory reservations with various filters
 * 7. Validate pagination and response structure
 *
 * Note: This test may return empty reservation data since no actual buyer
 * checkout process is simulated. The test validates the API structure and
 * filtering capabilities.
 */
export async function test_api_inventory_reservation_monitoring_by_seller(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "seller123";

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph({ sentences: 5 }),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin123";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin" as const,
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 3: Admin creates product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active" as const,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 4: Switch back to seller and create sale listing
  const sellerLoginResponse = await api.functional.auth.seller.login(
    connection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSeller.ILogin,
    },
  );
  typia.assert(sellerLoginResponse);

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new" as const,
        return_policy_days: 14,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 5: Create SKU variant
  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        variant_combination: JSON.stringify({ color: "red", size: "large" }),
        base_price: typia.random<
          number &
            tags.Type<"int32"> &
            tags.Minimum<1000> &
            tags.Maximum<100000>
        >() satisfies number as number,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku);

  // Step 6: Query inventory reservations - basic pagination
  const reservationsPage =
    await api.functional.shoppingMall.seller.inventoryReservations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallInventoryReservation.IRequest,
      },
    );
  typia.assert(reservationsPage);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination object exists",
    reservationsPage.pagination !== null &&
      reservationsPage.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(reservationsPage.data),
  );
  TestValidator.predicate(
    "pagination has valid current page",
    reservationsPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    reservationsPage.pagination.limit >= 0,
  );

  // Step 7: Query with SKU filter
  const skuFilteredPage =
    await api.functional.shoppingMall.seller.inventoryReservations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          shopping_mall_sale_sku_id: sku.id,
        } satisfies IShoppingMallInventoryReservation.IRequest,
      },
    );
  typia.assert(skuFilteredPage);

  // Validate filtered results structure
  TestValidator.predicate(
    "filtered pagination exists",
    skuFilteredPage.pagination !== null &&
      skuFilteredPage.pagination !== undefined,
  );
  TestValidator.predicate(
    "filtered data array exists",
    Array.isArray(skuFilteredPage.data),
  );

  // Step 8: Query with status filter
  const statusFilteredPage =
    await api.functional.shoppingMall.seller.inventoryReservations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          reservation_status: "active" as const,
        } satisfies IShoppingMallInventoryReservation.IRequest,
      },
    );
  typia.assert(statusFilteredPage);

  // Validate status filtered results
  TestValidator.predicate(
    "status filtered pagination exists",
    statusFilteredPage.pagination !== null &&
      statusFilteredPage.pagination !== undefined,
  );
  TestValidator.predicate(
    "status filtered data array exists",
    Array.isArray(statusFilteredPage.data),
  );

  // Step 9: Test date range filtering
  const now = new Date();
  const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const dateFilteredPage =
    await api.functional.shoppingMall.seller.inventoryReservations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          reserved_after: pastDate.toISOString(),
          reserved_before: futureDate.toISOString(),
        } satisfies IShoppingMallInventoryReservation.IRequest,
      },
    );
  typia.assert(dateFilteredPage);

  // Step 10: Test quantity range filtering
  const quantityFilteredPage =
    await api.functional.shoppingMall.seller.inventoryReservations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          reserved_quantity_min: 1,
          reserved_quantity_max: 100,
        } satisfies IShoppingMallInventoryReservation.IRequest,
      },
    );
  typia.assert(quantityFilteredPage);

  // Step 11: Test sorting functionality
  const sortedPage =
    await api.functional.shoppingMall.seller.inventoryReservations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at" as const,
          sort_order: "desc" as const,
        } satisfies IShoppingMallInventoryReservation.IRequest,
      },
    );
  typia.assert(sortedPage);

  TestValidator.predicate(
    "sorted results have valid structure",
    sortedPage.pagination !== null && Array.isArray(sortedPage.data),
  );
}
