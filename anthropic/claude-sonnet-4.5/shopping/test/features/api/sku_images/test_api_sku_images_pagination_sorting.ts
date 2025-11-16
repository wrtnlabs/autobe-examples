import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleImage";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleImage";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test pagination and sorting infrastructure for SKU-specific product image
 * queries.
 *
 * This test validates that the SKU image search endpoint properly handles
 * pagination and sorting parameters, returning correct pagination metadata and
 * accepting various query configurations. Since no image creation API is
 * available, this test focuses on validating the pagination infrastructure
 * itself by testing different page sizes, page numbers, and sorting options.
 *
 * The test creates the necessary entity hierarchy (admin, category, seller,
 * sale, SKU) and then queries the SKU images endpoint with various pagination
 * and sorting parameters to verify proper response structure and metadata
 * calculation.
 *
 * Steps:
 *
 * 1. Create admin account and authenticate
 * 2. Create product category
 * 3. Create seller account and authenticate
 * 4. Create product sale listing
 * 5. Create SKU variant for the sale
 * 6. Test pagination with page 1, limit 10
 * 7. Test pagination with page 1, limit 20
 * 8. Test pagination with page 2, limit 5
 * 9. Test sorting by display_order ascending
 * 10. Test sorting by created_at descending
 * 11. Validate pagination metadata structure
 */
export async function test_api_sku_images_pagination_sorting(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin" as const,
      email_verified: true,
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        parent_id: null,
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        status: "active" as const,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create seller account and authenticate
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "seller123",
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(3),
      business_description: RandomGenerator.paragraph({ sentences: 10 }),
      store_name: RandomGenerator.name(2),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Create product sale listing
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        brand: RandomGenerator.name(1),
        condition: "new" as const,
        short_description: RandomGenerator.paragraph({ sentences: 5 }),
        meta_keywords: RandomGenerator.paragraph({ sentences: 10 }),
        weight: typia.random<number & tags.Minimum<0>>(),
        dimension_length: typia.random<number & tags.Minimum<0>>(),
        dimension_width: typia.random<number & tags.Minimum<0>>(),
        dimension_height: typia.random<number & tags.Minimum<0>>(),
        manufacturer: RandomGenerator.name(2),
        return_policy_days: 30,
        warranty_info: RandomGenerator.paragraph({ sentences: 8 }),
        status: "published",
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 5: Create SKU variant for the sale
  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(10),
        variant_combination: JSON.stringify({ Color: "Blue", Size: "Large" }),
        base_price: typia.random<number & tags.Minimum<0>>(),
        compare_at_price: typia.random<number & tags.Minimum<0>>(),
        sale_price: null,
        sale_start_at: null,
        sale_end_at: null,
        cost_price: typia.random<number & tags.Minimum<0>>(),
        barcode: RandomGenerator.alphaNumeric(13),
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku);

  // Step 6: Test pagination with page 1, limit 10
  const page1Limit10 =
    await api.functional.shoppingMall.sales.skus.images.index(connection, {
      saleCode: sale.code,
      skuCode: sku.sku_code,
      body: {
        page: 1,
        limit: 10,
        sort: ["+display_order"],
        shopping_mall_sale_sku_id: sku.id,
      } satisfies IShoppingMallSaleImage.IRequest,
    });
  typia.assert(page1Limit10);

  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination current page should be 1",
    page1Limit10.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 10",
    page1Limit10.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    page1Limit10.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    page1Limit10.pagination.pages >= 0,
  );

  // Step 7: Test pagination with page 1, limit 20
  const page1Limit20 =
    await api.functional.shoppingMall.sales.skus.images.index(connection, {
      saleCode: sale.code,
      skuCode: sku.sku_code,
      body: {
        page: 1,
        limit: 20,
        sort: ["+display_order"],
        shopping_mall_sale_sku_id: sku.id,
      } satisfies IShoppingMallSaleImage.IRequest,
    });
  typia.assert(page1Limit20);

  TestValidator.predicate(
    "limit 20 pagination current should be 1",
    page1Limit20.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit 20 pagination limit should be 20",
    page1Limit20.pagination.limit === 20,
  );

  // Step 8: Test pagination with page 2, limit 5
  const page2Limit5 = await api.functional.shoppingMall.sales.skus.images.index(
    connection,
    {
      saleCode: sale.code,
      skuCode: sku.sku_code,
      body: {
        page: 2,
        limit: 5,
        sort: ["+display_order"],
        shopping_mall_sale_sku_id: sku.id,
      } satisfies IShoppingMallSaleImage.IRequest,
    },
  );
  typia.assert(page2Limit5);

  TestValidator.predicate(
    "page 2 current should be 2",
    page2Limit5.pagination.current === 2,
  );
  TestValidator.predicate(
    "page 2 limit should be 5",
    page2Limit5.pagination.limit === 5,
  );

  // Step 9: Test sorting by display_order ascending
  const sortAscending =
    await api.functional.shoppingMall.sales.skus.images.index(connection, {
      saleCode: sale.code,
      skuCode: sku.sku_code,
      body: {
        page: 1,
        limit: 50,
        sort: ["+display_order"],
        shopping_mall_sale_sku_id: sku.id,
      } satisfies IShoppingMallSaleImage.IRequest,
    });
  typia.assert(sortAscending);

  // Step 10: Test sorting by created_at descending
  const sortDescending =
    await api.functional.shoppingMall.sales.skus.images.index(connection, {
      saleCode: sale.code,
      skuCode: sku.sku_code,
      body: {
        page: 1,
        limit: 50,
        sort: ["-created_at"],
        shopping_mall_sale_sku_id: sku.id,
      } satisfies IShoppingMallSaleImage.IRequest,
    });
  typia.assert(sortDescending);

  // Step 11: Test query without SKU filter (product-level images)
  const productLevelImages =
    await api.functional.shoppingMall.sales.skus.images.index(connection, {
      saleCode: sale.code,
      skuCode: sku.sku_code,
      body: {
        page: 1,
        limit: 10,
        sort: ["+display_order"],
        shopping_mall_sale_sku_id: null,
      } satisfies IShoppingMallSaleImage.IRequest,
    });
  typia.assert(productLevelImages);

  TestValidator.predicate(
    "product-level images query should return valid pagination",
    productLevelImages.pagination.current === 1,
  );
}
