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
 * Test product image upload with accessibility alt text for SKU variants.
 *
 * This test validates that sellers can upload product images with descriptive
 * alt_text metadata for accessibility compliance and SEO optimization. The test
 * creates a complete product listing workflow including seller registration,
 * category setup, sale creation, SKU variant creation, and finally image upload
 * with meaningful alt text.
 *
 * The alt_text field enhances accessibility by providing screen reader
 * descriptions and improves product discoverability through search engine
 * optimization. The test verifies that alt text is properly stored, returned in
 * responses, and meets the maximum length constraint of 500 characters.
 */
export async function test_api_sku_image_upload_with_alt_text(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "SecurePass123!";

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile("+82"),
      business_name: `${RandomGenerator.name(2)} Business`,
      business_description: RandomGenerator.paragraph({ sentences: 5 }),
      store_name: `${RandomGenerator.name(1)} Store`,
      href: "https://marketplace.example.com/seller/register",
      referrer: "https://marketplace.example.com/home",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Create admin account for category management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile("+82"),
      admin_level: "super_admin",
      email_verified: true,
      href: "https://admin.marketplace.example.com/register",
      referrer: "https://admin.marketplace.example.com/login",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 3: Admin creates product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: "Electronics",
        slug: "electronics",
        description: "Electronic devices and accessories for modern lifestyle",
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 4: Switch back to seller context and create product sale
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://marketplace.example.com/seller/login",
      referrer: "https://marketplace.example.com/seller/dashboard",
    } satisfies IShoppingMallSeller.ILogin,
  });

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: `PROD-${RandomGenerator.alphaNumeric(8)}`,
        shopping_mall_category_id: category.id,
        title: "Premium Wireless Headphones",
        description: RandomGenerator.content({ paragraphs: 3 }),
        brand: "AudioTech",
        condition: "new",
        return_policy_days: 30,
        warranty_info: "2-year manufacturer warranty with free replacement",
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 5: Create SKU variant for the product
  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale.code,
      body: {
        sku_code: `${sale.code}-BLACK-STD`,
        variant_combination: JSON.stringify({
          Color: "Black",
          Size: "Standard",
        }),
        base_price: 199.99,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku);

  // Step 6: Upload product image with descriptive alt text for accessibility
  const descriptiveAltText =
    "Premium wireless headphones in matte black finish with soft cushioned ear pads, adjustable headband, and folding design for portability";

  const image =
    await api.functional.shoppingMall.seller.sales.skus.images.create(
      connection,
      {
        saleCode: sale.code,
        skuCode: sku.sku_code,
        body: {
          shopping_mall_sale_sku_id: sku.id,
          url_original:
            "https://cdn.example.com/products/headphones/original.jpg",
          url_large: "https://cdn.example.com/products/headphones/large.jpg",
          url_medium: "https://cdn.example.com/products/headphones/medium.jpg",
          url_small: "https://cdn.example.com/products/headphones/small.jpg",
          url_thumbnail:
            "https://cdn.example.com/products/headphones/thumb.jpg",
          is_primary: true,
          display_order: 0,
          alt_text: descriptiveAltText,
        } satisfies IShoppingMallSaleImage.ICreate,
      },
    );
  typia.assert(image);

  // Step 7: Validate that alt_text is properly stored and returned
  TestValidator.equals(
    "alt text is properly stored",
    image.alt_text,
    descriptiveAltText,
  );

  // Validate alt_text meets WCAG guidelines (meaningful description)
  TestValidator.predicate(
    "alt text is meaningful and descriptive",
    image.alt_text !== null &&
      image.alt_text !== undefined &&
      image.alt_text.length > 10 &&
      !image.alt_text.toLowerCase().includes("image") &&
      !image.alt_text.toLowerCase().includes("photo"),
  );

  // Validate alt_text respects maximum length constraint (500 characters)
  TestValidator.predicate(
    "alt text meets maximum length constraint",
    image.alt_text !== null &&
      image.alt_text !== undefined &&
      image.alt_text.length <= 500,
  );

  // Validate all image URLs are properly generated
  TestValidator.predicate(
    "all image URLs are present",
    image.url_original.length > 0 &&
      image.url_large.length > 0 &&
      image.url_medium.length > 0 &&
      image.url_small.length > 0 &&
      image.url_thumbnail.length > 0,
  );

  // Validate image is correctly associated with the SKU
  TestValidator.equals(
    "image associated with correct SKU",
    image.shopping_mall_sale_sku_id,
    sku.id,
  );
  TestValidator.equals("image is marked as primary", image.is_primary, true);
  TestValidator.equals(
    "image has correct display order",
    image.display_order,
    0,
  );
}
