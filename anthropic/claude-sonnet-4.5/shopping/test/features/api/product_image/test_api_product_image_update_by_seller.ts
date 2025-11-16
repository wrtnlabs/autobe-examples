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
 * Test updating product SKU image properties by authenticated seller.
 *
 * Validates the complete workflow for modifying product image metadata
 * including multi-resolution URLs, display ordering, primary image designation,
 * and accessibility text. Ensures proper seller authentication and ownership
 * enforcement throughout the image update process.
 *
 * Test workflow:
 *
 * 1. Create and authenticate seller account
 * 2. Create and authenticate admin account
 * 3. Admin creates product category
 * 4. Switch to seller context
 * 5. Seller creates sale listing
 * 6. Seller creates SKU variant
 * 7. Seller uploads initial image
 * 8. Seller updates image properties
 * 9. Validate all updates are reflected correctly
 */
export async function test_api_product_image_update_by_seller(
  connection: api.IConnection,
) {
  // Step 1: Create seller account and authenticate
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "seller123!";

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph({ sentences: 10 }),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Create admin account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin123!";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
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
        description: RandomGenerator.paragraph({ sentences: 5 }),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: typia.random<number & tags.Type<"int32">>(),
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
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 5: Seller creates sale listing
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        brand: RandomGenerator.name(1),
        condition: "new",
        short_description: RandomGenerator.paragraph({ sentences: 3 }),
        return_policy_days: 14,
        status: "published",
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 6: Seller creates SKU variant
  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(10),
        variant_combination: JSON.stringify({ color: "red", size: "medium" }),
        base_price: 99.99,
        compare_at_price: 129.99,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku);

  // Step 7: Seller uploads initial image
  const initialImage =
    await api.functional.shoppingMall.seller.sales.skus.images.create(
      connection,
      {
        saleCode: sale.code,
        skuCode: sku.sku_code,
        body: {
          shopping_mall_sale_sku_id: sku.id,
          url_original: typia.random<string & tags.Format<"uri">>(),
          url_large: typia.random<string & tags.Format<"uri">>(),
          url_medium: typia.random<string & tags.Format<"uri">>(),
          url_small: typia.random<string & tags.Format<"uri">>(),
          url_thumbnail: typia.random<string & tags.Format<"uri">>(),
          is_primary: true,
          display_order: 0,
          alt_text: "Initial product image",
        } satisfies IShoppingMallSaleImage.ICreate,
      },
    );
  typia.assert(initialImage);

  // Step 8: Seller updates image properties
  const updatedUrls = {
    url_original: typia.random<string & tags.Format<"uri">>(),
    url_large: typia.random<string & tags.Format<"uri">>(),
    url_medium: typia.random<string & tags.Format<"uri">>(),
    url_small: typia.random<string & tags.Format<"uri">>(),
    url_thumbnail: typia.random<string & tags.Format<"uri">>(),
  };

  const updatedImage =
    await api.functional.shoppingMall.seller.sales.skus.images.update(
      connection,
      {
        saleCode: sale.code,
        skuCode: sku.sku_code,
        imageId: initialImage.id,
        body: {
          url_original: updatedUrls.url_original,
          url_large: updatedUrls.url_large,
          url_medium: updatedUrls.url_medium,
          url_small: updatedUrls.url_small,
          url_thumbnail: updatedUrls.url_thumbnail,
          is_primary: false,
          display_order: 1,
          alt_text: "Updated product image with new metadata",
        } satisfies IShoppingMallSaleImage.IUpdate,
      },
    );
  typia.assert(updatedImage);

  // Step 9: Validate all updates are reflected correctly
  TestValidator.equals("image ID unchanged", updatedImage.id, initialImage.id);
  TestValidator.equals(
    "original URL updated",
    updatedImage.url_original,
    updatedUrls.url_original,
  );
  TestValidator.equals(
    "large URL updated",
    updatedImage.url_large,
    updatedUrls.url_large,
  );
  TestValidator.equals(
    "medium URL updated",
    updatedImage.url_medium,
    updatedUrls.url_medium,
  );
  TestValidator.equals(
    "small URL updated",
    updatedImage.url_small,
    updatedUrls.url_small,
  );
  TestValidator.equals(
    "thumbnail URL updated",
    updatedImage.url_thumbnail,
    updatedUrls.url_thumbnail,
  );
  TestValidator.equals("primary flag updated", updatedImage.is_primary, false);
  TestValidator.equals("display order updated", updatedImage.display_order, 1);

  typia.assertGuard(updatedImage.alt_text!);
  TestValidator.equals(
    "alt text updated",
    updatedImage.alt_text,
    "Updated product image with new metadata",
  );
}
