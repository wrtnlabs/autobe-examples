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
 * Test comprehensive SKU image metadata retrieval including display order,
 * primary flag, and alt text verification.
 *
 * This test validates that the image retrieval API returns complete and
 * accurate metadata for SKU images. It creates a seller account, sets up a
 * product with SKU variant, uploads multiple images with varying metadata
 * (different display_order values, is_primary flags, alt_text descriptions),
 * then retrieves each image individually to verify all metadata is preserved.
 *
 * The test ensures that:
 *
 * 1. Display order values are preserved exactly as uploaded
 * 2. Primary image flag (is_primary) is correctly set
 * 3. Alt text for accessibility is intact
 * 4. All responsive URL variants (original, large, medium, small, thumbnail) are
 *    present
 * 5. Metadata can be used for image gallery management and accessibility features
 */
export async function test_api_sku_image_retrieval_metadata_verification(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for category management
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    ip: undefined,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminCreateBody,
  });
  typia.assert(admin);

  // Step 2: Create seller account for product management
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerCreateBody = {
    email: sellerEmail,
    password: "SellerPass123!",
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_name: RandomGenerator.name(2),
    business_description: RandomGenerator.paragraph({ sentences: 5 }),
    store_name: RandomGenerator.name(2),
    ip: undefined,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerCreateBody,
  });
  typia.assert(seller);

  // Step 3: Admin creates category for product organization
  await api.functional.auth.admin.login(connection, {
    body: {
      email: admin.email,
      password: adminCreateBody.password,
      ip: undefined,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ILogin,
  });

  const categoryBody = {
    parent_id: undefined,
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    image_url: typia.random<string & tags.Format<"uri">>(),
    display_order: 0,
    status: "active" as const,
  } satisfies IShoppingMallCategory.ICreate;

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    { body: categoryBody },
  );
  typia.assert(category);

  // Step 4: Switch to seller account and create product sale
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "SellerPass123!",
      ip: undefined,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  const saleCode = RandomGenerator.alphaNumeric(12);
  const saleBody = {
    code: saleCode,
    shopping_mall_category_id: category.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 3 }),
    brand: RandomGenerator.name(1),
    condition: "new" as const,
    short_description: RandomGenerator.paragraph({ sentences: 3 }),
    meta_keywords: undefined,
    weight: undefined,
    dimension_length: undefined,
    dimension_width: undefined,
    dimension_height: undefined,
    manufacturer: RandomGenerator.name(2),
    return_policy_days: 30,
    warranty_info: RandomGenerator.paragraph({ sentences: 5 }),
    status: "published",
  } satisfies IShoppingMallSale.ICreate;

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    { body: saleBody },
  );
  typia.assert(sale);

  // Step 5: Create SKU variant for image attachment
  const skuCode = RandomGenerator.alphaNumeric(10);
  const skuBody = {
    sku_code: skuCode,
    variant_combination: JSON.stringify({ Color: "Blue", Size: "Medium" }),
    base_price: 99.99,
    compare_at_price: 129.99,
    sale_price: undefined,
    sale_start_at: undefined,
    sale_end_at: undefined,
    cost_price: 50.0,
    barcode: RandomGenerator.alphaNumeric(13),
    enabled: true,
  } satisfies IShoppingMallSaleSku.ICreate;

  const sku = await api.functional.shoppingMall.seller.sales.skus.create(
    connection,
    {
      saleCode: sale.code,
      body: skuBody,
    },
  );
  typia.assert(sku);

  // Step 6: Upload multiple images with varying metadata
  const imageMetadata = [
    {
      display_order: 0,
      is_primary: true,
      alt_text: "Product front view - main display image",
    },
    {
      display_order: 1,
      is_primary: false,
      alt_text: "Product side view - showing dimensions",
    },
    {
      display_order: 2,
      is_primary: false,
      alt_text: "Product detail close-up - texture and materials",
    },
  ];

  const uploadedImages: IShoppingMallSaleImage[] = [];

  for (const metadata of imageMetadata) {
    const imageBody = {
      shopping_mall_sale_sku_id: sku.id,
      url_original: typia.random<string & tags.Format<"uri">>(),
      url_large: typia.random<string & tags.Format<"uri">>(),
      url_medium: typia.random<string & tags.Format<"uri">>(),
      url_small: typia.random<string & tags.Format<"uri">>(),
      url_thumbnail: typia.random<string & tags.Format<"uri">>(),
      is_primary: metadata.is_primary,
      display_order: metadata.display_order,
      alt_text: metadata.alt_text,
    } satisfies IShoppingMallSaleImage.ICreate;

    const uploadedImage =
      await api.functional.shoppingMall.seller.sales.skus.images.create(
        connection,
        {
          saleCode: sale.code,
          skuCode: sku.sku_code,
          body: imageBody,
        },
      );
    typia.assert(uploadedImage);
    uploadedImages.push(uploadedImage);
  }

  // Step 7: Retrieve each image individually and verify metadata
  for (let i = 0; i < uploadedImages.length; i++) {
    const uploadedImage = uploadedImages[i];
    const expectedMetadata = imageMetadata[i];

    const retrievedImage =
      await api.functional.shoppingMall.sales.skus.images.at(connection, {
        saleCode: sale.code,
        skuCode: sku.sku_code,
        imageId: uploadedImage.id,
      });
    typia.assert(retrievedImage);

    // Validate display_order is preserved
    TestValidator.equals(
      `Image ${i + 1}: display_order should match uploaded value`,
      retrievedImage.display_order,
      expectedMetadata.display_order,
    );

    // Validate is_primary flag is correct
    TestValidator.equals(
      `Image ${i + 1}: is_primary flag should match uploaded value`,
      retrievedImage.is_primary,
      expectedMetadata.is_primary,
    );

    // Validate alt_text is intact for accessibility
    TestValidator.equals(
      `Image ${i + 1}: alt_text should be preserved`,
      retrievedImage.alt_text,
      expectedMetadata.alt_text,
    );

    // Validate all 5 responsive URL variants are present and non-empty
    TestValidator.predicate(
      `Image ${i + 1}: url_original should be a valid URI`,
      retrievedImage.url_original.length > 0,
    );
    TestValidator.predicate(
      `Image ${i + 1}: url_large should be a valid URI`,
      retrievedImage.url_large.length > 0,
    );
    TestValidator.predicate(
      `Image ${i + 1}: url_medium should be a valid URI`,
      retrievedImage.url_medium.length > 0,
    );
    TestValidator.predicate(
      `Image ${i + 1}: url_small should be a valid URI`,
      retrievedImage.url_small.length > 0,
    );
    TestValidator.predicate(
      `Image ${i + 1}: url_thumbnail should be a valid URI`,
      retrievedImage.url_thumbnail.length > 0,
    );

    // Validate retrieved image matches uploaded image
    TestValidator.equals(
      `Image ${i + 1}: retrieved image ID should match uploaded image ID`,
      retrievedImage.id,
      uploadedImage.id,
    );
    TestValidator.equals(
      `Image ${i + 1}: sale ID should match`,
      retrievedImage.shopping_mall_sale_id,
      sale.id,
    );
    TestValidator.equals(
      `Image ${i + 1}: SKU ID should match`,
      retrievedImage.shopping_mall_sale_sku_id,
      sku.id,
    );
  }

  // Step 8: Validate overall image metadata for gallery management
  TestValidator.predicate(
    "Exactly one image should be marked as primary",
    uploadedImages.filter((img) => img.is_primary).length === 1,
  );

  TestValidator.predicate(
    "Primary image should have display_order 0",
    uploadedImages.find((img) => img.is_primary)?.display_order === 0,
  );

  TestValidator.predicate(
    "All images should have unique display_order values",
    new Set(uploadedImages.map((img) => img.display_order)).size ===
      uploadedImages.length,
  );
}
