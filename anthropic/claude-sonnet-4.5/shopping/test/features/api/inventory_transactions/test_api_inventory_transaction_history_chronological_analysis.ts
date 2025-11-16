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
 * Test retrieving inventory transactions sorted chronologically to analyze the
 * complete timeline of inventory movements for a SKU.
 *
 * This test validates that sellers can view transactions in time order for
 * sequential analysis and audit purposes. The chronological ordering enables
 * sellers to trace the complete history of stock changes, verify inventory
 * calculations, and identify when specific movements occurred for audit and
 * reconciliation.
 *
 * Workflow:
 *
 * 1. Seller authenticates by creating a new account
 * 2. Admin creates a product category
 * 3. Seller creates a product sale listing
 * 4. Seller creates a SKU variant
 * 5. Seller performs initial inventory stock creation (generates first
 *    transaction)
 * 6. Seller retrieves transactions sorted by created_at in ascending order (oldest
 *    first)
 * 7. Seller retrieves transactions sorted by created_at in descending order
 *    (newest first)
 *
 * Validation points:
 *
 * - Transactions are correctly ordered by creation timestamp
 * - Ascending sort shows oldest transactions first
 * - Descending sort shows newest transactions first
 */
export async function test_api_inventory_transaction_history_chronological_analysis(
  connection: api.IConnection,
) {
  // 1. Seller authenticates by creating a new account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph({ sentences: 5 }),
      store_name: RandomGenerator.name(2),
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // 2. Admin creates a product category
  await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin" as const,
      email_verified: true,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        parent_id: null,
        image_url: null,
        display_order: 1,
        status: "active" as const,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // 3. Seller logs back in and creates product sale listing
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  const saleCode = RandomGenerator.alphaNumeric(12);
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: saleCode,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        brand: RandomGenerator.name(1),
        condition: "new" as const,
        short_description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 7,
        }),
        meta_keywords: null,
        weight: typia.random<
          number & tags.Minimum<0>
        >() satisfies number as number,
        dimension_length: typia.random<
          number & tags.Minimum<0>
        >() satisfies number as number,
        dimension_width: typia.random<
          number & tags.Minimum<0>
        >() satisfies number as number,
        dimension_height: typia.random<
          number & tags.Minimum<0>
        >() satisfies number as number,
        manufacturer: RandomGenerator.name(2),
        return_policy_days: RandomGenerator.pick([0, 7, 14, 30, 60] as const),
        warranty_info: RandomGenerator.paragraph({ sentences: 4 }),
        status: "draft",
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // 4. Seller creates SKU variant
  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: saleCode,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        variant_combination: JSON.stringify({ Color: "Red", Size: "Large" }),
        base_price: typia.random<
          number & tags.Minimum<0>
        >() satisfies number as number,
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

  // 5. Seller creates initial inventory stock (this creates the first transaction)
  const initialQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
  >() satisfies number as number;
  const inventoryStock =
    await api.functional.shoppingMall.seller.saleSkus.inventoryStock.create(
      connection,
      {
        saleSkuId: sku.id,
        body: {
          total_quantity: initialQuantity,
          low_stock_threshold: 5,
        } satisfies IShoppingMallInventoryStock.ICreate,
      },
    );
  typia.assert(inventoryStock);

  // 6. Seller retrieves transactions sorted by created_at in ascending order (oldest first)
  const ascendingResult =
    await api.functional.shoppingMall.seller.saleSkus.inventoryTransactions.index(
      connection,
      {
        saleSkuId: sku.id,
        body: {
          page: 1,
          limit: 100,
          sort_by: "created_at" as const,
          sort_order: "asc" as const,
        } satisfies IShoppingMallInventoryTransaction.IRequest,
      },
    );
  typia.assert(ascendingResult);

  // Validate ascending order - each transaction should have created_at >= previous transaction
  for (let i = 1; i < ascendingResult.data.length; i++) {
    const prevTimestamp = new Date(
      ascendingResult.data[i - 1].created_at,
    ).getTime();
    const currTimestamp = new Date(
      ascendingResult.data[i].created_at,
    ).getTime();
    TestValidator.predicate(
      "ascending order: current transaction timestamp should be >= previous",
      currTimestamp >= prevTimestamp,
    );
  }

  // 7. Seller retrieves transactions sorted by created_at in descending order (newest first)
  const descendingResult =
    await api.functional.shoppingMall.seller.saleSkus.inventoryTransactions.index(
      connection,
      {
        saleSkuId: sku.id,
        body: {
          page: 1,
          limit: 100,
          sort_by: "created_at" as const,
          sort_order: "desc" as const,
        } satisfies IShoppingMallInventoryTransaction.IRequest,
      },
    );
  typia.assert(descendingResult);

  // Validate descending order - each transaction should have created_at <= previous transaction
  for (let i = 1; i < descendingResult.data.length; i++) {
    const prevTimestamp = new Date(
      descendingResult.data[i - 1].created_at,
    ).getTime();
    const currTimestamp = new Date(
      descendingResult.data[i].created_at,
    ).getTime();
    TestValidator.predicate(
      "descending order: current transaction timestamp should be <= previous",
      currTimestamp <= prevTimestamp,
    );
  }

  // Verify both result sets contain the same transactions (just ordered differently)
  TestValidator.equals(
    "ascending and descending results should have same record count",
    ascendingResult.pagination.records,
    descendingResult.pagination.records,
  );
}
