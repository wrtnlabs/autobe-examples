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
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test inventory transaction search pagination functionality.
 *
 * This test validates the proper handling of paginated inventory transaction
 * queries, ensuring that sellers can efficiently navigate through large
 * transaction histories with accurate pagination metadata and consistent result
 * ordering.
 *
 * Workflow:
 *
 * 1. Create seller account and authenticate
 * 2. Create admin account and authenticate
 * 3. Admin creates product category
 * 4. Switch back to seller authentication
 * 5. Seller creates product sale listing
 * 6. Seller creates variant attributes (Size and Color)
 * 7. Seller adds variant values to each attribute
 * 8. Seller creates SKU with variant combination
 * 9. Seller initializes inventory stock
 * 10. Seller performs 25 inventory updates to generate extensive transaction
 *     history
 * 11. Search transactions with page=1 and limit=10
 * 12. Validate first page pagination metadata
 * 13. Search transactions with page=2 and limit=10
 * 14. Validate second page pagination metadata
 * 15. Verify no overlap between page 1 and page 2 results
 * 16. Test different limit values (5, 20)
 * 17. Verify total records consistency across all requests
 * 18. Test requesting page beyond total pages returns empty results with valid
 *     metadata
 */
export async function test_api_inventory_transactions_search_pagination(
  connection: api.IConnection,
) {
  // 1. Create seller account and authenticate
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 5,
        wordMax: 10,
      }),
      business_description: RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 8,
        sentenceMax: 12,
      }),
      store_name: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 4,
        wordMax: 8,
      }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // 2. Create admin account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

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

  // 3. Admin creates product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 6,
        }),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 10,
        }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        status: "active" as const,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // 4. Switch back to seller authentication
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 5. Seller creates product sale listing
  const saleCode = RandomGenerator.alphaNumeric(12);
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: saleCode,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 8,
        }),
        description: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
        brand: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 6,
        }),
        condition: "new" as const,
        return_policy_days: 30 as const,
        warranty_info: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 6,
          wordMax: 10,
        }),
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // 6. Seller creates variant attribute - Size
  const sizeAttribute =
    await api.functional.shoppingMall.seller.sales.variantAttributes.create(
      connection,
      {
        saleCode: saleCode,
        body: {
          name: "Size",
          display_order: 0,
        } satisfies IShoppingMallSaleVariantAttribute.ICreate,
      },
    );
  typia.assert(sizeAttribute);

  // 7. Seller adds variant values to Size attribute
  const sizeSmall =
    await api.functional.shoppingMall.seller.sales.variantAttributes.values.create(
      connection,
      {
        saleCode: saleCode,
        variantAttributeId: sizeAttribute.id,
        body: {
          value: "Small",
          display_order: 0,
        } satisfies IShoppingMallSaleVariantValue.ICreate,
      },
    );
  typia.assert(sizeSmall);

  const sizeMedium =
    await api.functional.shoppingMall.seller.sales.variantAttributes.values.create(
      connection,
      {
        saleCode: saleCode,
        variantAttributeId: sizeAttribute.id,
        body: {
          value: "Medium",
          display_order: 1,
        } satisfies IShoppingMallSaleVariantValue.ICreate,
      },
    );
  typia.assert(sizeMedium);

  // 8. Seller creates SKU with variant combination
  const skuCode = RandomGenerator.alphaNumeric(8);
  const variantCombination = JSON.stringify({ Size: "Medium" });

  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: saleCode,
      body: {
        sku_code: skuCode,
        variant_combination: variantCombination,
        base_price: 10000,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku);

  // 9. Seller initializes inventory stock
  const initialStock =
    await api.functional.shoppingMall.seller.saleSkus.inventoryStock.create(
      connection,
      {
        saleSkuId: sku.id,
        body: {
          total_quantity: 1000,
          low_stock_threshold: 50,
        } satisfies IShoppingMallInventoryStock.ICreate,
      },
    );
  typia.assert(initialStock);

  // 10. Seller performs 25 inventory updates to generate extensive transaction history
  await ArrayUtil.asyncRepeat(25, async (index) => {
    const updateQuantity = 1000 + (index + 1) * 10;
    const updatedStock =
      await api.functional.shoppingMall.seller.saleSkus.inventoryStock.update(
        connection,
        {
          saleSkuId: sku.id,
          body: {
            total_quantity: updateQuantity,
          } satisfies IShoppingMallInventoryStock.IUpdate,
        },
      );
    typia.assert(updatedStock);
  });

  // 11. Search transactions with page=1 and limit=10
  const page1Result =
    await api.functional.shoppingMall.seller.inventoryTransactions.index(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: sku.id,
          page: 1,
          limit: 10,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IShoppingMallInventoryTransaction.IRequest,
      },
    );
  typia.assert(page1Result);

  // 12. Validate first page pagination metadata
  TestValidator.equals(
    "page 1 current page is 1",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit is 10", page1Result.pagination.limit, 10);
  TestValidator.predicate(
    "page 1 has records",
    page1Result.pagination.records > 0,
  );
  TestValidator.predicate("page 1 has pages", page1Result.pagination.pages > 0);
  TestValidator.predicate(
    "page 1 data length matches limit or remaining",
    page1Result.data.length <= 10,
  );
  TestValidator.predicate(
    "page 1 has transactions",
    page1Result.data.length > 0,
  );

  // 13. Search transactions with page=2 and limit=10
  const page2Result =
    await api.functional.shoppingMall.seller.inventoryTransactions.index(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: sku.id,
          page: 2,
          limit: 10,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IShoppingMallInventoryTransaction.IRequest,
      },
    );
  typia.assert(page2Result);

  // 14. Validate second page pagination metadata
  TestValidator.equals(
    "page 2 current page is 2",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit is 10", page2Result.pagination.limit, 10);
  TestValidator.equals(
    "page 2 total records matches page 1",
    page2Result.pagination.records,
    page1Result.pagination.records,
  );
  TestValidator.equals(
    "page 2 total pages matches page 1",
    page2Result.pagination.pages,
    page1Result.pagination.pages,
  );
  TestValidator.predicate(
    "page 2 data length within limit",
    page2Result.data.length <= 10,
  );

  // 15. Verify no overlap between page 1 and page 2 results
  const page1Ids = page1Result.data.map((t) => t.id);
  const page2Ids = page2Result.data.map((t) => t.id);

  const hasOverlap = page1Ids.some((id) => page2Ids.includes(id));
  TestValidator.predicate(
    "no duplicate transactions between page 1 and page 2",
    !hasOverlap,
  );

  // 16. Test different limit value (limit=5)
  const limit5Result =
    await api.functional.shoppingMall.seller.inventoryTransactions.index(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: sku.id,
          page: 1,
          limit: 5,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IShoppingMallInventoryTransaction.IRequest,
      },
    );
  typia.assert(limit5Result);

  TestValidator.equals(
    "limit 5 current page is 1",
    limit5Result.pagination.current,
    1,
  );
  TestValidator.equals("limit 5 limit is 5", limit5Result.pagination.limit, 5);
  TestValidator.predicate(
    "limit 5 data length respects limit",
    limit5Result.data.length <= 5,
  );
  TestValidator.equals(
    "limit 5 total records matches previous",
    limit5Result.pagination.records,
    page1Result.pagination.records,
  );

  // Calculate expected pages for limit=5
  const expectedPagesForLimit5 = Math.ceil(limit5Result.pagination.records / 5);
  TestValidator.equals(
    "limit 5 pages calculation is correct",
    limit5Result.pagination.pages,
    expectedPagesForLimit5,
  );

  // 17. Test different limit value (limit=20)
  const limit20Result =
    await api.functional.shoppingMall.seller.inventoryTransactions.index(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: sku.id,
          page: 1,
          limit: 20,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IShoppingMallInventoryTransaction.IRequest,
      },
    );
  typia.assert(limit20Result);

  TestValidator.equals(
    "limit 20 current page is 1",
    limit20Result.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit 20 limit is 20",
    limit20Result.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "limit 20 data length respects limit",
    limit20Result.data.length <= 20,
  );
  TestValidator.equals(
    "limit 20 total records matches previous",
    limit20Result.pagination.records,
    page1Result.pagination.records,
  );

  // Calculate expected pages for limit=20
  const expectedPagesForLimit20 = Math.ceil(
    limit20Result.pagination.records / 20,
  );
  TestValidator.equals(
    "limit 20 pages calculation is correct",
    limit20Result.pagination.pages,
    expectedPagesForLimit20,
  );

  // 18. Test requesting page beyond total pages
  const beyondPageNumber = page1Result.pagination.pages + 10;
  const beyondPageResult =
    await api.functional.shoppingMall.seller.inventoryTransactions.index(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: sku.id,
          page: beyondPageNumber,
          limit: 10,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IShoppingMallInventoryTransaction.IRequest,
      },
    );
  typia.assert(beyondPageResult);

  TestValidator.equals(
    "beyond page current matches request",
    beyondPageResult.pagination.current,
    beyondPageNumber,
  );
  TestValidator.equals(
    "beyond page limit is 10",
    beyondPageResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "beyond page total records matches",
    beyondPageResult.pagination.records,
    page1Result.pagination.records,
  );
  TestValidator.equals(
    "beyond page total pages matches",
    beyondPageResult.pagination.pages,
    page1Result.pagination.pages,
  );
  TestValidator.equals(
    "beyond page returns empty data",
    beyondPageResult.data.length,
    0,
  );
}
