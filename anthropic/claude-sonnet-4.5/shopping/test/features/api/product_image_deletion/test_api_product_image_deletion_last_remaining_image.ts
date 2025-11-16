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
 * Test deleting the last remaining image from a SKU variant.
 *
 * This scenario validates the system's handling when a seller removes the only
 * image associated with a product variant. The test creates a SKU with a single
 * product image, then deletes it, leaving the SKU without any visual
 * representation.
 *
 * It verifies that the deletion succeeds even when it's the last image, and
 * that the SKU remains in a valid state without images. This scenario is
 * important for testing edge cases where products may temporarily have no
 * images during inventory updates or when sellers are reorganizing their
 * product photography.
 *
 * Test Flow:
 *
 * 1. Create admin account and authenticate
 * 2. Create product category for organization
 * 3. Create seller account and authenticate
 * 4. Create product sale listing
 * 5. Create SKU variant for the product
 * 6. Upload a single image to the SKU (this will be the only image)
 * 7. Delete that image, leaving the SKU with zero images
 * 8. Validate the deletion succeeded and returned proper image data
 */
export async function test_api_product_image_deletion_last_remaining_image(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin for category setup
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
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active" as const,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create and authenticate seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(3),
      business_description: RandomGenerator.paragraph({ sentences: 5 }),
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
        code: RandomGenerator.alphaNumeric(16),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 7,
        }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        brand: RandomGenerator.name(1),
        condition: "new" as const,
        return_policy_days: 14,
        warranty_info: RandomGenerator.paragraph({ sentences: 3 }),
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
        sku_code: RandomGenerator.alphaNumeric(12),
        variant_combination: JSON.stringify({ Color: "Red", Size: "Medium" }),
        base_price: typia.random<number & tags.Minimum<0>>(),
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    },
  );
  typia.assert(sku);

  // Step 6: Upload a single image to the SKU (this will be the only image)
  const imageUrl = typia.random<string & tags.Format<"uri">>();

  const uploadedImage =
    await api.functional.shoppingMall.seller.sales.skus.images.create(
      connection,
      {
        saleCode: sale.code,
        skuCode: sku.sku_code,
        body: {
          shopping_mall_sale_sku_id: sku.id,
          url_original: imageUrl,
          url_large: imageUrl,
          url_medium: imageUrl,
          url_small: imageUrl,
          url_thumbnail: imageUrl,
          is_primary: true,
          display_order: 0,
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IShoppingMallSaleImage.ICreate,
      },
    );
  typia.assert(uploadedImage);

  // Step 7: Delete the image (removing the last/only image from the SKU)
  const deletedImage =
    await api.functional.shoppingMall.seller.sales.skus.images.erase(
      connection,
      {
        saleCode: sale.code,
        skuCode: sku.sku_code,
        imageId: uploadedImage.id,
      },
    );

  // Step 8: Validate the deletion succeeded
  typia.assert(deletedImage);

  TestValidator.equals(
    "deleted image ID matches uploaded image",
    deletedImage.id,
    uploadedImage.id,
  );

  TestValidator.equals(
    "deleted image belongs to the correct SKU",
    deletedImage.shopping_mall_sale_sku_id,
    sku.id,
  );
}
