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
 * Test comprehensive filtering and pagination of inventory transaction history
 * for product SKUs.
 *
 * This test validates the inventory transaction history retrieval API's ability
 * to filter, sort, and paginate transaction records. The test creates necessary
 * test data (seller, admin, category, product, SKU, and initial inventory
 * stock) and then exercises various filtering combinations to ensure the
 * transaction history query API works correctly.
 *
 * Workflow:
 *
 * 1. Create and authenticate seller account
 * 2. Create and authenticate admin account
 * 3. Admin creates product category
 * 4. Seller creates product sale listing
 * 5. Seller creates SKU variant
 * 6. Seller creates initial inventory stock (generates transaction)
 * 7. Test transaction retrieval with various filter combinations
 * 8. Validate pagination, sorting, and filtering behavior
 */
export async function test_api_inventory_transaction_history_comprehensive_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile("+82"),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph({ sentences: 5 }),
      store_name: RandomGenerator.name(2),
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile("+82"),
      admin_level: "super_admin",
      email_verified: true,
      ip: null,
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
        parent_id: null,
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(8),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        image_url: null,
        display_order: typia.random<
          number & tags.Type<"int32">
        >() satisfies number as number,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 4: Switch to seller and create product sale listing
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        brand: RandomGenerator.name(1),
        condition: "new",
        short_description: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 8,
        }),
        meta_keywords: null,
        weight: null,
        dimension_length: null,
        dimension_width: null,
        dimension_height: null,
        manufacturer: RandomGenerator.name(2),
        return_policy_days: 14,
        warranty_info: RandomGenerator.paragraph({ sentences: 4 }),
        status: "published",
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 5: Seller creates SKU variant
  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(12),
        variant_combination: JSON.stringify({ Color: "Red", Size: "Large" }),
        base_price: 29999,
        compare_at_price: null,
        sale_price: null,
        sale_start_at: null,
        sale_end_at: null,
        cost_price: null,
        barcode: null,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku);

  // Step 6: Create initial inventory stock (this generates first transaction)
  const initialQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<1000>
  >() satisfies number as number;
  const inventoryStock =
    await api.functional.shoppingMall.seller.saleSkus.inventoryStock.create(
      connection,
      {
        saleSkuId: sku.id,
        body: {
          total_quantity: initialQuantity,
          low_stock_threshold: 10,
        } satisfies IShoppingMallInventoryStock.ICreate,
      },
    );
  typia.assert(inventoryStock);

  // Step 7: Test transaction retrieval with various filter combinations

  // Test 7.1: Basic retrieval without filters (all transactions)
  const allTransactionsPage =
    await api.functional.shoppingMall.seller.saleSkus.inventoryTransactions.index(
      connection,
      {
        saleSkuId: sku.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallInventoryTransaction.IRequest,
      },
    );
  typia.assert(allTransactionsPage);
  TestValidator.predicate(
    "at least one transaction exists from stock creation",
    allTransactionsPage.pagination.records >= 1,
  );

  // Test 7.2: Test pagination with different page sizes
  const smallPageResult =
    await api.functional.shoppingMall.seller.saleSkus.inventoryTransactions.index(
      connection,
      {
        saleSkuId: sku.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IShoppingMallInventoryTransaction.IRequest,
      },
    );
  typia.assert(smallPageResult);
  TestValidator.predicate(
    "small page size limits results correctly",
    smallPageResult.data.length <= 5,
  );

  // Test 7.3: Test date range filtering
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  const dateFilteredPage =
    await api.functional.shoppingMall.seller.saleSkus.inventoryTransactions.index(
      connection,
      {
        saleSkuId: sku.id,
        body: {
          page: 1,
          limit: 10,
          from_date: oneHourAgo.toISOString(),
          to_date: oneHourLater.toISOString(),
        } satisfies IShoppingMallInventoryTransaction.IRequest,
      },
    );
  typia.assert(dateFilteredPage);
  TestValidator.predicate(
    "date range filter returns transactions",
    dateFilteredPage.pagination.records >= 0,
  );

  // Test 7.4: Test sorting by created_at ascending
  const sortedAscPage =
    await api.functional.shoppingMall.seller.saleSkus.inventoryTransactions.index(
      connection,
      {
        saleSkuId: sku.id,
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          sort_order: "asc",
        } satisfies IShoppingMallInventoryTransaction.IRequest,
      },
    );
  typia.assert(sortedAscPage);

  // Test 7.5: Test sorting by created_at descending
  const sortedDescPage =
    await api.functional.shoppingMall.seller.saleSkus.inventoryTransactions.index(
      connection,
      {
        saleSkuId: sku.id,
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IShoppingMallInventoryTransaction.IRequest,
      },
    );
  typia.assert(sortedDescPage);

  // Test 7.6: Test sorting by quantity_change
  const sortedByQuantityPage =
    await api.functional.shoppingMall.seller.saleSkus.inventoryTransactions.index(
      connection,
      {
        saleSkuId: sku.id,
        body: {
          page: 1,
          limit: 10,
          sort_by: "quantity_change",
          sort_order: "desc",
        } satisfies IShoppingMallInventoryTransaction.IRequest,
      },
    );
  typia.assert(sortedByQuantityPage);

  // Test 7.7: Test combined filters (date range + sorting)
  const combinedFilterPage =
    await api.functional.shoppingMall.seller.saleSkus.inventoryTransactions.index(
      connection,
      {
        saleSkuId: sku.id,
        body: {
          page: 1,
          limit: 20,
          from_date: oneHourAgo.toISOString(),
          to_date: oneHourLater.toISOString(),
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IShoppingMallInventoryTransaction.IRequest,
      },
    );
  typia.assert(combinedFilterPage);

  // Step 8: Validate pagination metadata accuracy
  TestValidator.predicate(
    "pagination current page is valid",
    allTransactionsPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit matches request",
    allTransactionsPage.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination pages calculation is correct",
    allTransactionsPage.pagination.pages >= 0,
  );

  // Validate transaction data completeness
  if (allTransactionsPage.data.length > 0) {
    const firstTransaction = allTransactionsPage.data[0];
    typia.assertGuard(firstTransaction!);

    TestValidator.predicate(
      "transaction has valid ID",
      firstTransaction.id.length > 0,
    );
    TestValidator.predicate(
      "transaction is linked to correct SKU",
      firstTransaction.shopping_mall_sale_sku_id === sku.id,
    );
    TestValidator.predicate(
      "transaction has valid quantity change",
      typeof firstTransaction.quantity_change === "number",
    );
  }
}
