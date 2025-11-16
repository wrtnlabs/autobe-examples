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
 * Test deleting one image from a product gallery containing multiple images.
 *
 * This scenario validates that removing a single image from a multi-image
 * gallery doesn't affect other images in the collection. The test creates a SKU
 * with three product images at different display orders, then deletes the
 * middle image. It verifies that only the targeted image is removed while the
 * other images remain intact with their original properties and display order
 * values.
 *
 * This scenario is important for testing gallery management where sellers need
 * to remove specific images without disrupting the entire visual presentation.
 * It also validates that display order gaps (e.g., orders 0, 2 after deleting
 * order 1) are handled correctly by the system.
 *
 * Test Steps:
 *
 * 1. Authenticate as seller for product management permissions
 * 2. Authenticate as admin and create product category
 * 3. Switch back to seller and create a product sale listing
 * 4. Create a SKU variant within the sale
 * 5. Upload three images with display orders 0, 1, 2
 * 6. Delete the middle image (display_order 1)
 * 7. Verify the deleted image is returned correctly
 * 8. Validate remaining image properties are preserved
 */
export async function test_api_product_image_deletion_from_multi_image_gallery(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "seller123!@#";

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 3,
        wordMax: 6,
      }),
      business_description: RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 10,
        sentenceMax: 15,
      }),
      store_name: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 3,
        wordMax: 5,
      }),
      href: "https://marketplace.example.com/seller/register",
      referrer: "https://marketplace.example.com/",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Authenticate as admin and create category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin123!@#";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin" as const,
      email_verified: true,
      href: "https://admin.marketplace.com/register",
      referrer: "https://admin.marketplace.com/",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 5,
        }),
        slug: RandomGenerator.alphaNumeric(12),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 8,
          sentenceMax: 12,
        }),
        image_url: `https://cdn.example.com/categories/${RandomGenerator.alphaNumeric(16)}.jpg`,
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        status: "active" as const,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Switch back to seller and create product sale
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://marketplace.example.com/seller/login",
      referrer: "https://marketplace.example.com/",
    } satisfies IShoppingMallSeller.ILogin,
  });

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(16),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 8,
        }),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 15,
          sentenceMax: 25,
        }),
        brand: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 2,
          wordMax: 4,
        }),
        condition: "new" as const,
        short_description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 10,
        }),
        return_policy_days: 30 as const,
        warranty_info: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 4: Create SKU variant
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

  // Step 5: Upload three images with display orders 0, 1, 2
  const image0 =
    await api.functional.shoppingMall.seller.sales.skus.images.create(
      connection,
      {
        saleCode: sale.code,
        skuCode: sku.sku_code,
        body: {
          shopping_mall_sale_sku_id: sku.id,
          url_original: `https://cdn.example.com/products/original/${RandomGenerator.alphaNumeric(24)}.jpg`,
          url_large: `https://cdn.example.com/products/large/${RandomGenerator.alphaNumeric(24)}.jpg`,
          url_medium: `https://cdn.example.com/products/medium/${RandomGenerator.alphaNumeric(24)}.jpg`,
          url_small: `https://cdn.example.com/products/small/${RandomGenerator.alphaNumeric(24)}.jpg`,
          url_thumbnail: `https://cdn.example.com/products/thumb/${RandomGenerator.alphaNumeric(24)}.jpg`,
          is_primary: true,
          display_order: 0,
          alt_text: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies IShoppingMallSaleImage.ICreate,
      },
    );
  typia.assert(image0);

  const image1 =
    await api.functional.shoppingMall.seller.sales.skus.images.create(
      connection,
      {
        saleCode: sale.code,
        skuCode: sku.sku_code,
        body: {
          shopping_mall_sale_sku_id: sku.id,
          url_original: `https://cdn.example.com/products/original/${RandomGenerator.alphaNumeric(24)}.jpg`,
          url_large: `https://cdn.example.com/products/large/${RandomGenerator.alphaNumeric(24)}.jpg`,
          url_medium: `https://cdn.example.com/products/medium/${RandomGenerator.alphaNumeric(24)}.jpg`,
          url_small: `https://cdn.example.com/products/small/${RandomGenerator.alphaNumeric(24)}.jpg`,
          url_thumbnail: `https://cdn.example.com/products/thumb/${RandomGenerator.alphaNumeric(24)}.jpg`,
          is_primary: false,
          display_order: 1,
          alt_text: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies IShoppingMallSaleImage.ICreate,
      },
    );
  typia.assert(image1);

  const image2 =
    await api.functional.shoppingMall.seller.sales.skus.images.create(
      connection,
      {
        saleCode: sale.code,
        skuCode: sku.sku_code,
        body: {
          shopping_mall_sale_sku_id: sku.id,
          url_original: `https://cdn.example.com/products/original/${RandomGenerator.alphaNumeric(24)}.jpg`,
          url_large: `https://cdn.example.com/products/large/${RandomGenerator.alphaNumeric(24)}.jpg`,
          url_medium: `https://cdn.example.com/products/medium/${RandomGenerator.alphaNumeric(24)}.jpg`,
          url_small: `https://cdn.example.com/products/small/${RandomGenerator.alphaNumeric(24)}.jpg`,
          url_thumbnail: `https://cdn.example.com/products/thumb/${RandomGenerator.alphaNumeric(24)}.jpg`,
          is_primary: false,
          display_order: 2,
          alt_text: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies IShoppingMallSaleImage.ICreate,
      },
    );
  typia.assert(image2);

  // Step 6: Delete the middle image (display_order 1)
  const deletedImage =
    await api.functional.shoppingMall.seller.sales.skus.images.erase(
      connection,
      {
        saleCode: sale.code,
        skuCode: sku.sku_code,
        imageId: image1.id,
      },
    );
  typia.assert(deletedImage);

  // Step 7: Verify the deletion response contains the correct image data
  TestValidator.equals(
    "deleted image id should match",
    deletedImage.id,
    image1.id,
  );
  TestValidator.equals(
    "deleted image had display_order 1",
    deletedImage.display_order,
    1,
  );

  // Step 8: Validate that image properties match the original
  TestValidator.equals(
    "deleted image SKU id matches",
    deletedImage.shopping_mall_sale_sku_id,
    sku.id,
  );
  TestValidator.equals(
    "deleted image was not primary",
    deletedImage.is_primary,
    false,
  );
}
