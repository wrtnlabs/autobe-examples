import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryTransaction";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryStock } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryStock";
import type { IShoppingMallInventoryTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryTransaction";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test pagination functionality when navigating through inventory transaction
 * histories.
 *
 * This test validates that sellers can efficiently retrieve and navigate
 * through inventory transaction records using pagination controls. It tests
 * various page sizes, page navigation, and pagination metadata accuracy.
 *
 * Workflow:
 *
 * 1. Create seller account for inventory management
 * 2. Create admin account for category management
 * 3. Admin creates product category
 * 4. Seller creates product sale listing
 * 5. Seller creates SKU variant
 * 6. Seller initializes inventory stock
 * 7. Test pagination with different page sizes
 * 8. Validate pagination metadata accuracy
 * 9. Test page navigation through result set
 */
export async function test_api_inventory_transaction_history_pagination_navigation(
  connection: api.IConnection,
) {
  // Step 1: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph({ sentences: 10 }),
      store_name: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Create admin account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
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

  // Step 3: Admin creates category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(1),
        slug: RandomGenerator.alphaNumeric(10),
        display_order: 1,
        status: "active" as const,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 4: Switch back to seller and create product sale
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new" as const,
        return_policy_days: 30 as const,
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
        variant_combination: JSON.stringify({ Color: "Red", Size: "Large" }),
        base_price: 10000,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku);

  // Step 6: Initialize inventory stock
  const inventoryStock =
    await api.functional.shoppingMall.seller.saleSkus.inventoryStock.create(
      connection,
      {
        saleSkuId: sku.id,
        body: {
          total_quantity: 100,
          low_stock_threshold: 10,
        } satisfies IShoppingMallInventoryStock.ICreate,
      },
    );
  typia.assert(inventoryStock);

  // Step 7: Test pagination with different page sizes
  const pageSizes = [1, 10, 25, 50, 100] as const;

  for (const limit of pageSizes) {
    const firstPage =
      await api.functional.shoppingMall.seller.saleSkus.inventoryTransactions.index(
        connection,
        {
          saleSkuId: sku.id,
          body: {
            page: 1,
            limit: limit satisfies number as number,
          } satisfies IShoppingMallInventoryTransaction.IRequest,
        },
      );
    typia.assert(firstPage);

    // Validate pagination metadata
    TestValidator.equals("current page is 1", firstPage.pagination.current, 1);
    TestValidator.equals(
      "limit matches request",
      firstPage.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      "total records is non-negative",
      firstPage.pagination.records >= 0,
    );
    TestValidator.predicate(
      "total pages is non-negative",
      firstPage.pagination.pages >= 0,
    );

    // Validate data array size
    TestValidator.predicate(
      "data size does not exceed limit",
      firstPage.data.length <= limit,
    );

    // If there are multiple pages, test navigation
    if (firstPage.pagination.pages > 1) {
      const secondPage =
        await api.functional.shoppingMall.seller.saleSkus.inventoryTransactions.index(
          connection,
          {
            saleSkuId: sku.id,
            body: {
              page: 2,
              limit: limit satisfies number as number,
            } satisfies IShoppingMallInventoryTransaction.IRequest,
          },
        );
      typia.assert(secondPage);

      TestValidator.equals(
        "current page is 2",
        secondPage.pagination.current,
        2,
      );
      TestValidator.equals(
        "total records consistent",
        secondPage.pagination.records,
        firstPage.pagination.records,
      );
      TestValidator.equals(
        "total pages consistent",
        secondPage.pagination.pages,
        firstPage.pagination.pages,
      );

      // Validate no duplicate records between pages using Set for performance
      const firstPageIds = new Set(firstPage.data.map((t) => t.id));
      const duplicates = secondPage.data.filter((t) => firstPageIds.has(t.id));
      TestValidator.equals("no duplicates across pages", duplicates.length, 0);
    }

    // Test last page
    if (firstPage.pagination.pages > 0) {
      const lastPage =
        await api.functional.shoppingMall.seller.saleSkus.inventoryTransactions.index(
          connection,
          {
            saleSkuId: sku.id,
            body: {
              page: firstPage.pagination.pages,
              limit: limit satisfies number as number,
            } satisfies IShoppingMallInventoryTransaction.IRequest,
          },
        );
      typia.assert(lastPage);

      TestValidator.equals(
        "last page number correct",
        lastPage.pagination.current,
        firstPage.pagination.pages,
      );
      TestValidator.predicate(
        "last page size valid",
        lastPage.data.length > 0 && lastPage.data.length <= limit,
      );
    }
  }

  // Step 8: Test with no filters (all transactions)
  const allTransactions =
    await api.functional.shoppingMall.seller.saleSkus.inventoryTransactions.index(
      connection,
      {
        saleSkuId: sku.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallInventoryTransaction.IRequest,
      },
    );
  typia.assert(allTransactions);

  // Validate pagination calculation
  const expectedPages = Math.ceil(
    allTransactions.pagination.records / allTransactions.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation correct",
    allTransactions.pagination.pages,
    expectedPages,
  );
}
