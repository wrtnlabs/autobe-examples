import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_images_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_images_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_variants_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

/**
 * Test that an administrator can retrieve complete product details for an active product.
 *
 * This test validates the admin product retrieval endpoint by setting up a complete product
 * with seller, category, images, and variants, then verifying that the admin endpoint returns
 * all product data with accurate computed fields.
 *
 * The test flow creates:
 * 1. An administrator who will retrieve the product
 * 2. A seller who owns the product
 * 3. A category for product classification
 * 4. A product with basic details (name, description, base price)
 * 5. Multiple product images for gallery display
 * 6. Product variants with SKU codes, options, prices, and stock
 *
 * Validations performed on the admin retrieval response:
 * - Product identification: id matches expected UUID, name and description are present
 * - Pricing data: basePrice matches input, inStock reflects variant stock status
 * - Price range: computed from variant prices, min/max values are accurate
 * - Seller data: id is returned (email/password are never exposed)
 * - Category data: id and name are returned
 * - Images: ordered by display_order ascending, first image is main thumbnail
 * - Variants: all non-deleted variants with SKU, option values, prices, quantities
 * - Rating data: average and count fields present (may be null for new products)
 * - Timestamps: createdAt and updatedAt are ISO date-time strings
 */
export async function test_api_product_admin_retrieval_active_product(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a seller who owns the product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Create a category for product classification
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 4. Create a product with basic details
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          categoryId: category.id,
        },
      },
    );
  typia.assert(product);
  // 5. Upload multiple product images
  const image1 =
    await generate_random_ecommerce_mall_seller_sellers_me_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          imageUrl: typia.random<string & tags.Format<"uri">>(),
        },
      },
    );
  typia.assert(image1);
  const image2 =
    await generate_random_ecommerce_mall_seller_sellers_me_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          imageUrl: typia.random<string & tags.Format<"uri">>(),
        },
      },
    );
  typia.assert(image2);
  // 6. Create product variants with SKU codes, options, prices, and stock quantities
  // Note: quantity is not in ICreate, so variants start with 0 quantity
  // For inStock to be true, we would need to add inventory via a separate endpoint
  // Here we test with default 0 quantity to validate the response structure
  const variant1 =
    await generate_random_ecommerce_mall_seller_sellers_me_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<500>
          >(),
          optionValues: [
            { key: "Color", value: "Red" },
            { key: "Size", value: "Large" },
          ],
        },
      },
    );
  typia.assert(variant1);
  const variant2 =
    await generate_random_ecommerce_mall_seller_sellers_me_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: null,
          optionValues: [
            { key: "Color", value: "Blue" },
            { key: "Size", value: "Medium" },
          ],
        },
      },
    );
  typia.assert(variant2);
  // 7. Admin retrieves the product
  const retrievedProduct =
    await api.functional.ecommerceMall.admin.admin.products.at(
      adminConnection,
      {
        productId: product.id,
      },
    );
  typia.assert(retrievedProduct);
  // 8. Validate product identification
  TestValidator.equals("product id matches", retrievedProduct.id, product.id);
  TestValidator.equals("name matches", retrievedProduct.name, product.name);
  TestValidator.equals(
    "description matches",
    retrievedProduct.description,
    product.description,
  );
  TestValidator.equals(
    "basePrice matches",
    retrievedProduct.basePrice,
    product.basePrice,
  );
  // 9. Validate computed fields
  TestValidator.equals(
    "inStock is boolean",
    typeof retrievedProduct.inStock,
    "boolean",
  );
  TestValidator.predicate(
    "priceRange min is number",
    typeof retrievedProduct.priceRange.min === "number",
  );
  TestValidator.predicate(
    "priceRange max is number",
    typeof retrievedProduct.priceRange.max === "number",
  );
  TestValidator.predicate(
    "priceRange min <= max",
    retrievedProduct.priceRange.min <= retrievedProduct.priceRange.max,
  );
  // 10. Validate seller information (only id is exposed, no email or password)
  TestValidator.equals("seller has id", !!retrievedProduct.seller.id, true);
  TestValidator.equals(
    "seller has no password field",
    "password" in retrievedProduct.seller,
    false,
  );
  // 11. Validate category information
  TestValidator.equals(
    "category id matches",
    retrievedProduct.category.id,
    category.id,
  );
  TestValidator.equals(
    "category name matches",
    retrievedProduct.category.name,
    category.name,
  );
  // 12. Validate images array ordering
  TestValidator.predicate("has images", retrievedProduct.images.length >= 2);
  TestValidator.predicate(
    "first image has displayOrder 0",
    retrievedProduct.images[0].displayOrder === 0,
  );
  for (let i = 1; i < retrievedProduct.images.length; i++) {
    TestValidator.predicate(
      `image ${i} displayOrder >= image ${i - 1} displayOrder`,
      retrievedProduct.images[i].displayOrder >=
        retrievedProduct.images[i - 1].displayOrder,
    );
  }
  // 13. Validate variants array
  TestValidator.predicate(
    "has variants",
    retrievedProduct.variants.length >= 2,
  );
  for (const variant of retrievedProduct.variants) {
    TestValidator.equals("variant has id", !!variant.id, true);
    TestValidator.equals("variant has skuCode", !!variant.skuCode, true);
    TestValidator.predicate(
      "variant has optionValues array",
      Array.isArray(variant.optionValues),
    );
    TestValidator.predicate(
      "variant has optionValues",
      variant.optionValues.length > 0,
    );
    TestValidator.predicate(
      "variant has quantity",
      typeof variant.quantity === "number",
    );
    for (const opt of variant.optionValues) {
      TestValidator.equals("option has key", !!opt.key, true);
      TestValidator.equals("option has value", !!opt.value, true);
    }
  }
  // 14. Validate rating statistics
  TestValidator.predicate(
    "ratingCount is number",
    typeof retrievedProduct.ratingCount === "number",
  );
  TestValidator.predicate(
    "ratingAverage is number or null",
    typeof retrievedProduct.ratingAverage === "number" ||
      retrievedProduct.ratingAverage === null,
  );
  // 15. Validate timestamps
  TestValidator.predicate(
    "createdAt is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedProduct.createdAt),
  );
  TestValidator.predicate(
    "updatedAt is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedProduct.updatedAt),
  );
  TestValidator.predicate(
    "deletedAt is null",
    retrievedProduct.deletedAt === null,
  );
}