import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleImage";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test image upload with both sale-level and SKU-level associations.
 *
 * This test validates the dual-level image association system in the
 * marketplace:
 *
 * 1. Sale-level images (shopping_mall_sale_sku_id = null) - shared across all SKU
 *    variants
 * 2. SKU-level images (shopping_mall_sale_sku_id = specific SKU ID) -
 *    variant-specific images
 *
 * The test creates a product with multiple SKU variants, uploads both types of
 * images, and verifies that sale-level images serve as fallbacks while
 * SKU-specific images override them for their designated variants.
 *
 * Workflow:
 *
 * 1. Create and authenticate seller account
 * 2. Create and authenticate admin account
 * 3. Admin creates product category
 * 4. Seller creates product sale
 * 5. Seller creates multiple SKU variants (SKU1 and SKU2)
 * 6. Upload sale-level images (visible to all SKUs)
 * 7. Upload SKU-specific images for SKU1 only
 * 8. Validate image associations and fallback behavior
 */
export async function test_api_sku_image_upload_sale_level_vs_sku_level(
  connection: api.IConnection,
) {
  // Step 1: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "seller123!@#";
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile("+82"),
        business_name: `${RandomGenerator.name()} Electronics Co.`,
        business_description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 4,
          wordMax: 8,
        }),
        store_name: `${RandomGenerator.name()} Store`,
        href: "https://marketplace.example.com/seller/register",
        referrer: "https://marketplace.example.com/home",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 2: Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin123!@#";
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile("+82"),
        admin_level: "super_admin",
        email_verified: true,
        href: "https://marketplace.example.com/admin/register",
        referrer: "https://marketplace.example.com/admin/login",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 3: Admin creates category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: "Electronics",
        slug: "electronics",
        description: "Electronic devices and accessories",
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Step 4: Switch to seller and create product sale
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://marketplace.example.com/seller/login",
      referrer: "https://marketplace.example.com",
    } satisfies IShoppingMallSeller.ILogin,
  });

  const sale: IShoppingMallSale =
    await api.functional.shoppingMall.seller.sales.create(connection, {
      body: {
        code: `PROD-${RandomGenerator.alphaNumeric(8)}`,
        shopping_mall_category_id: category.id,
        title: "Premium Wireless Headphones",
        description: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
        brand: "AudioTech",
        condition: "new",
        return_policy_days: 30,
        warranty_info: "2-year manufacturer warranty",
      } satisfies IShoppingMallSale.ICreate,
    });
  typia.assert(sale);

  // Step 5: Create multiple SKU variants
  const sku1: IShoppingMallSaleSku =
    await api.functional.shoppingMall.seller.sales.skus.create(connection, {
      saleCode: sale.code,
      body: {
        sku_code: `${sale.code}-BLACK`,
        variant_combination: JSON.stringify({ Color: "Black" }),
        base_price: 199.99,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    });
  typia.assert(sku1);

  const sku2: IShoppingMallSaleSku =
    await api.functional.shoppingMall.seller.sales.skus.create(connection, {
      saleCode: sale.code,
      body: {
        sku_code: `${sale.code}-WHITE`,
        variant_combination: JSON.stringify({ Color: "White" }),
        base_price: 199.99,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    });
  typia.assert(sku2);

  // Step 6: Upload sale-level images (shared across all SKUs)
  const saleLevelImage1: IShoppingMallSaleImage =
    await api.functional.shoppingMall.seller.sales.skus.images.create(
      connection,
      {
        saleCode: sale.code,
        skuCode: sku1.sku_code,
        body: {
          shopping_mall_sale_sku_id: null,
          url_original:
            "https://cdn.example.com/products/headphones-original-1.jpg",
          url_large: "https://cdn.example.com/products/headphones-large-1.jpg",
          url_medium:
            "https://cdn.example.com/products/headphones-medium-1.jpg",
          url_small: "https://cdn.example.com/products/headphones-small-1.jpg",
          url_thumbnail:
            "https://cdn.example.com/products/headphones-thumb-1.jpg",
          is_primary: true,
          display_order: 0,
          alt_text: "Premium wireless headphones front view",
        } satisfies IShoppingMallSaleImage.ICreate,
      },
    );
  typia.assert(saleLevelImage1);

  const saleLevelImage2: IShoppingMallSaleImage =
    await api.functional.shoppingMall.seller.sales.skus.images.create(
      connection,
      {
        saleCode: sale.code,
        skuCode: sku1.sku_code,
        body: {
          shopping_mall_sale_sku_id: null,
          url_original:
            "https://cdn.example.com/products/headphones-original-2.jpg",
          url_large: "https://cdn.example.com/products/headphones-large-2.jpg",
          url_medium:
            "https://cdn.example.com/products/headphones-medium-2.jpg",
          url_small: "https://cdn.example.com/products/headphones-small-2.jpg",
          url_thumbnail:
            "https://cdn.example.com/products/headphones-thumb-2.jpg",
          is_primary: false,
          display_order: 1,
          alt_text: "Premium wireless headphones side view",
        } satisfies IShoppingMallSaleImage.ICreate,
      },
    );
  typia.assert(saleLevelImage2);

  // Step 7: Upload SKU-specific images for SKU1 (Black variant)
  const skuSpecificImage1: IShoppingMallSaleImage =
    await api.functional.shoppingMall.seller.sales.skus.images.create(
      connection,
      {
        saleCode: sale.code,
        skuCode: sku1.sku_code,
        body: {
          shopping_mall_sale_sku_id: sku1.id,
          url_original:
            "https://cdn.example.com/products/headphones-black-original-1.jpg",
          url_large:
            "https://cdn.example.com/products/headphones-black-large-1.jpg",
          url_medium:
            "https://cdn.example.com/products/headphones-black-medium-1.jpg",
          url_small:
            "https://cdn.example.com/products/headphones-black-small-1.jpg",
          url_thumbnail:
            "https://cdn.example.com/products/headphones-black-thumb-1.jpg",
          is_primary: true,
          display_order: 0,
          alt_text: "Black wireless headphones front view",
        } satisfies IShoppingMallSaleImage.ICreate,
      },
    );
  typia.assert(skuSpecificImage1);

  const skuSpecificImage2: IShoppingMallSaleImage =
    await api.functional.shoppingMall.seller.sales.skus.images.create(
      connection,
      {
        saleCode: sale.code,
        skuCode: sku1.sku_code,
        body: {
          shopping_mall_sale_sku_id: sku1.id,
          url_original:
            "https://cdn.example.com/products/headphones-black-original-2.jpg",
          url_large:
            "https://cdn.example.com/products/headphones-black-large-2.jpg",
          url_medium:
            "https://cdn.example.com/products/headphones-black-medium-2.jpg",
          url_small:
            "https://cdn.example.com/products/headphones-black-small-2.jpg",
          url_thumbnail:
            "https://cdn.example.com/products/headphones-black-thumb-2.jpg",
          is_primary: false,
          display_order: 1,
          alt_text: "Black wireless headphones detail view",
        } satisfies IShoppingMallSaleImage.ICreate,
      },
    );
  typia.assert(skuSpecificImage2);

  // Step 8: Validate image associations
  // Validate sale-level images have null SKU ID
  TestValidator.equals(
    "sale-level image 1 has null SKU ID",
    saleLevelImage1.shopping_mall_sale_sku_id,
    null,
  );
  TestValidator.equals(
    "sale-level image 2 has null SKU ID",
    saleLevelImage2.shopping_mall_sale_sku_id,
    null,
  );

  // Validate SKU-specific images have correct SKU ID
  TestValidator.equals(
    "SKU-specific image 1 has correct SKU ID",
    skuSpecificImage1.shopping_mall_sale_sku_id,
    sku1.id,
  );
  TestValidator.equals(
    "SKU-specific image 2 has correct SKU ID",
    skuSpecificImage2.shopping_mall_sale_sku_id,
    sku1.id,
  );

  // Validate sale-level images are associated with the sale
  TestValidator.equals(
    "sale-level image 1 is associated with sale",
    saleLevelImage1.shopping_mall_sale_id,
    sale.id,
  );
  TestValidator.equals(
    "sale-level image 2 is associated with sale",
    saleLevelImage2.shopping_mall_sale_id,
    sale.id,
  );

  // Validate SKU-specific images are associated with the sale
  TestValidator.equals(
    "SKU-specific image 1 is associated with sale",
    skuSpecificImage1.shopping_mall_sale_id,
    sale.id,
  );
  TestValidator.equals(
    "SKU-specific image 2 is associated with sale",
    skuSpecificImage2.shopping_mall_sale_id,
    sale.id,
  );

  // Validate primary image flags
  TestValidator.equals(
    "sale-level image 1 is primary",
    saleLevelImage1.is_primary,
    true,
  );
  TestValidator.equals(
    "SKU-specific image 1 is primary for its SKU",
    skuSpecificImage1.is_primary,
    true,
  );

  // Validate display order
  TestValidator.predicate(
    "sale-level images have correct display order",
    saleLevelImage1.display_order < saleLevelImage2.display_order,
  );
  TestValidator.predicate(
    "SKU-specific images have correct display order",
    skuSpecificImage1.display_order < skuSpecificImage2.display_order,
  );
}
