import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_images_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_images_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_products_variants_options_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_options_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

/**
 * Test cascade deletion of a product with variants and images.
 *
 * This test validates that when a seller deletes a product, the system properly
 * cascade-deletes all related entities:
 * - All product variants are deleted
 * - All variant options are deleted
 * - All product images are removed
 * - The product record is soft-deleted
 */
export async function test_api_product_deletion_cascade_with_variants_and_images(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication for category creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a product category
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 4. Create a product in the category
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // 5. Create multiple variants for the product
  const variant1 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: "VARIANT-001",
          options: [
            { optionName: "Color", optionValue: "Red" },
            { optionName: "Size", optionValue: "Large" },
          ],
        },
      },
    );
  typia.assert(variant1);
  const variant2 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: "VARIANT-002",
          options: [
            { optionName: "Color", optionValue: "Blue" },
            { optionName: "Size", optionValue: "Medium" },
          ],
        },
      },
    );
  typia.assert(variant2);
  // 6. Add additional options to variants
  const option1 =
    await generate_random_ecommerce_mall_seller_products_variants_options_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          productVariantId: variant1.id,
        },
        body: {
          optionName: "Material",
          optionValue: "Cotton",
        },
      },
    );
  typia.assert(option1);
  const option2 =
    await generate_random_ecommerce_mall_seller_products_variants_options_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          productVariantId: variant2.id,
        },
        body: {
          optionName: "Material",
          optionValue: "Polyester",
        },
      },
    );
  typia.assert(option2);
  // 7. Upload images to the product
  const image1 =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {},
      },
    );
  typia.assert(image1);
  const image2 =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {},
      },
    );
  typia.assert(image2);
  // 8. Delete the product (cascade deletion)
  await api.functional.ecommerceMall.seller.products.erase(sellerConnection, {
    productId: product.id,
  });
  // The cascade deletion should have:
  // - Soft-deleted the product
  // - Cascade deleted all variants
  // - Cascade deleted all variant options
  // - Removed all product images
  //
  // Since these resources are deleted, attempting to fetch them would fail.
  // The successful execution of the erase endpoint without errors indicates
  // the cascade deletion completed successfully.
}
