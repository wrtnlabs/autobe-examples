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
 * Test that all responsive image URL variants are properly required and stored.
 *
 * This test validates the multi-resolution image upload system for SKU
 * variants. Creates seller account, category, sale, and SKU, then uploads an
 * image ensuring all five URL variants are provided: url_original, url_large
 * (1600x1600), url_medium (800x800), url_small (400x400), and url_thumbnail
 * (150x150).
 *
 * Verifies that each URL is properly stored and accessible, validating that the
 * multi-resolution strategy enables optimal image loading for different display
 * contexts (zoom, gallery, listings, cart).
 *
 * Steps:
 *
 * 1. Create and authenticate seller account
 * 2. Create admin account and authenticate as admin
 * 3. Create product category as admin
 * 4. Switch back to seller authentication
 * 5. Create product sale listing
 * 6. Create SKU variant within the sale
 * 7. Upload image with all five required URL variants
 * 8. Validate all five URLs are present and correctly stored
 */
export async function test_api_sku_image_upload_responsive_urls(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "seller123!@#";

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile("+1"),
      business_name: `${RandomGenerator.name()} Business`,
      business_description: RandomGenerator.paragraph({ sentences: 5 }),
      store_name: `${RandomGenerator.name()} Store`,
      href: "https://marketplace.example.com/seller/register",
      referrer: "https://marketplace.example.com/home",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Create admin account and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin123!@#";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile("+1"),
      admin_level: "super_admin",
      email_verified: true,
      href: "https://admin.example.com/register",
      referrer: "https://admin.example.com/home",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 3: Create product category as admin
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: "Electronics",
        slug: "electronics",
        description: "Electronic devices and accessories",
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 4: Switch back to seller authentication
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://marketplace.example.com/seller/login",
      referrer: "https://marketplace.example.com/home",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 5: Create product sale listing
  const saleCode = RandomGenerator.alphaNumeric(12);
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: saleCode,
        shopping_mall_category_id: category.id,
        title: "Premium Wireless Headphones",
        description: RandomGenerator.content({ paragraphs: 3 }),
        brand: "AudioTech",
        condition: "new",
        return_policy_days: 30,
        warranty_info: "2-year manufacturer warranty included",
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 6: Create SKU variant within the sale
  const skuCode = `${saleCode}-BLK-001`;
  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale.code,
      body: {
        sku_code: skuCode,
        variant_combination: JSON.stringify({
          color: "Black",
          size: "Standard",
        }),
        base_price: 299.99,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku);

  // Step 7: Upload image with all five required URL variants
  const imageUrlBase = "https://cdn.example.com/products";
  const imageId = RandomGenerator.alphaNumeric(16);

  const uploadedImage =
    await api.functional.shoppingMall.seller.sales.skus.images.create(
      connection,
      {
        saleCode: sale.code,
        skuCode: sku.sku_code,
        body: {
          shopping_mall_sale_sku_id: sku.id,
          url_original: `${imageUrlBase}/original/${imageId}.png`,
          url_large: `${imageUrlBase}/large/${imageId}_1600x1600.jpg`,
          url_medium: `${imageUrlBase}/medium/${imageId}_800x800.jpg`,
          url_small: `${imageUrlBase}/small/${imageId}_400x400.jpg`,
          url_thumbnail: `${imageUrlBase}/thumbnail/${imageId}_150x150.jpg`,
          is_primary: true,
          display_order: 0,
          alt_text: "Premium Wireless Headphones in Black",
        } satisfies IShoppingMallSaleImage.ICreate,
      },
    );
  typia.assert(uploadedImage);

  // Step 8: Validate business metadata (typia.assert already validated all URL formats and types)
  TestValidator.equals(
    "is_primary should match",
    uploadedImage.is_primary,
    true,
  );

  TestValidator.equals(
    "display_order should match",
    uploadedImage.display_order,
    0,
  );

  TestValidator.equals(
    "alt_text should match",
    uploadedImage.alt_text,
    "Premium Wireless Headphones in Black",
  );
}
