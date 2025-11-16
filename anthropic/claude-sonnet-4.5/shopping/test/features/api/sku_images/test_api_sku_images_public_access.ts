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
 * Test that SKU-specific images can be retrieved without authentication.
 *
 * This test validates that product variant images are publicly accessible,
 * enabling buyers to view SKU-specific images during shopping without login.
 *
 * Test workflow:
 *
 * 1. Create admin account and authenticate
 * 2. Create product category
 * 3. Create seller account and authenticate
 * 4. Create product sale listing
 * 5. Create SKU variant for the product
 * 6. Query SKU images WITHOUT authentication (public access)
 * 7. Verify successful retrieval of paginated image list
 */
export async function test_api_sku_images_public_access(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "super_admin",
        email_verified: true,
        ip: typia.random<string & tags.Format<"ipv4">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create product category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Step 3: Create and authenticate seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        business_name: RandomGenerator.name(3),
        business_description: RandomGenerator.content({ paragraphs: 2 }),
        store_name: RandomGenerator.name(2),
        ip: typia.random<string & tags.Format<"ipv4">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 4: Create product sale listing
  const sale: IShoppingMallSale =
    await api.functional.shoppingMall.seller.sales.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        brand: RandomGenerator.name(1),
        condition: "new",
        short_description: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
        meta_keywords: RandomGenerator.paragraph({ sentences: 3 }),
        weight: typia.random<number & tags.Minimum<0>>(),
        dimension_length: typia.random<number & tags.Minimum<0>>(),
        dimension_width: typia.random<number & tags.Minimum<0>>(),
        dimension_height: typia.random<number & tags.Minimum<0>>(),
        manufacturer: RandomGenerator.name(2),
        return_policy_days: RandomGenerator.pick([7, 14, 30, 60] as const),
        warranty_info: RandomGenerator.paragraph({ sentences: 5 }),
        status: "published",
      } satisfies IShoppingMallSale.ICreate,
    });
  typia.assert(sale);

  // Step 5: Create SKU variant
  const sku: IShoppingMallSaleSku =
    await api.functional.shoppingMall.seller.sales.skus.create(connection, {
      saleCode: sale.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(10),
        variant_combination: JSON.stringify({ color: "Red", size: "Large" }),
        base_price: typia.random<number & tags.Minimum<0>>(),
        compare_at_price: typia.random<number & tags.Minimum<0>>(),
        sale_price: typia.random<number & tags.Minimum<0>>(),
        sale_start_at: new Date().toISOString(),
        sale_end_at: new Date(Date.now() + 86400000 * 30).toISOString(),
        cost_price: typia.random<number & tags.Minimum<0>>(),
        barcode: RandomGenerator.alphaNumeric(13),
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    });
  typia.assert(sku);

  // Step 6: Query SKU images WITHOUT authentication (public access test)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const imagesResult: IPageIShoppingMallSaleImage.ISummary =
    await api.functional.shoppingMall.sales.skus.images.index(
      unauthenticatedConnection,
      {
        saleCode: sale.code,
        skuCode: sku.sku_code,
        body: {
          page: 1,
          limit: 10,
          shopping_mall_sale_sku_id: sku.id,
        } satisfies IShoppingMallSaleImage.IRequest,
      },
    );
  typia.assert(imagesResult);

  // Step 7: Verify successful public access to SKU images
  TestValidator.predicate(
    "pagination object exists",
    imagesResult.pagination !== null && imagesResult.pagination !== undefined,
  );

  TestValidator.predicate(
    "data array exists",
    Array.isArray(imagesResult.data),
  );

  TestValidator.predicate(
    "pagination current page is 1",
    imagesResult.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit is 10",
    imagesResult.pagination.limit === 10,
  );
}
