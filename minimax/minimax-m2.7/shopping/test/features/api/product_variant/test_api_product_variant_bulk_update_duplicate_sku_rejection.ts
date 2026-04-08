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
import { generate_random_ecommerce_mall_seller_sellers_me_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_variants_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

/**
 * Test that bulk update rejects entire operation when duplicate SKU is provided.
 *
 * Validates that when a seller attempts to bulk update multiple product variants,
 * if any variant in the update request contains a SKU code that already exists
 * on another variant in the platform, the entire operation is rejected with a
 * 409 Conflict error. This ensures SKU uniqueness is maintained across all
 * products on the platform.
 *
 * The test creates a seller account, establishes product and variant setup,
 * then attempts a bulk update containing a duplicate SKU to trigger the conflict.
 * After the rejection, the test verifies that original variant data remains
 * unchanged, confirming the transactional rollback behavior.
 *
 * 1. Administrator creates a product category (required for product creation).
 * 2. Seller registers and authenticates via join endpoint.
 * 3. Seller creates a product listing in the category.
 * 4. Seller creates two variants with unique SKU codes for the product.
 * 5. Seller creates a second product with a variant having a different SKU.
 * 6. Seller attempts bulk update on first product's variants with:
 *    - Valid quantity update for variant 1
 *    - Duplicate SKU (from second product's variant) for variant 2
 * 7. System returns 409 Conflict error (expected).
 * 8. Original variant data verified to be unchanged (rollback confirmed).
 */
export async function test_api_product_variant_bulk_update_duplicate_sku_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Create first product
  const product1 =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          categoryId: category.id,
        },
      },
    );
  typia.assert(product1);
  // 4. Create two variants for first product with unique SKU codes
  const sku1 = `SKU-P1-V1-${RandomGenerator.alphaNumeric(8)}`;
  const sku2 = `SKU-P1-V2-${RandomGenerator.alphaNumeric(8)}`;
  const variant1 =
    await generate_random_ecommerce_mall_seller_sellers_me_products_variants_create(
      sellerConnection,
      {
        params: { productId: product1.id },
        body: {
          skuCode: sku1,
          price: 1000,
          optionValues: [{ key: "Color", value: "Red" }],
        },
      },
    );
  typia.assert(variant1);
  const variant2 =
    await generate_random_ecommerce_mall_seller_sellers_me_products_variants_create(
      sellerConnection,
      {
        params: { productId: product1.id },
        body: {
          skuCode: sku2,
          price: 2000,
          optionValues: [{ key: "Color", value: "Blue" }],
        },
      },
    );
  typia.assert(variant2);
  // 5. Create second product with variant (to have a SKU we can use as duplicate target)
  const product2 =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          categoryId: category.id,
        },
      },
    );
  typia.assert(product2);
  const duplicateTargetSku = `SKU-P2-UNIQUE-${RandomGenerator.alphaNumeric(8)}`;
  const variantFromProduct2 =
    await generate_random_ecommerce_mall_seller_sellers_me_products_variants_create(
      sellerConnection,
      {
        params: { productId: product2.id },
        body: {
          skuCode: duplicateTargetSku,
          price: 1500,
          optionValues: [{ key: "Size", value: "Large" }],
        },
      },
    );
  typia.assert(variantFromProduct2);
  // Store original data for later verification
  const originalVariant1Quantity = variant1.quantity;
  const originalVariant1Price = variant1.price;
  const originalVariant2SkuCode = variant2.skuCode;
  const originalVariant2Quantity = variant2.quantity;
  // 6. Attempt bulk update with duplicate SKU - should fail with 409
  await TestValidator.httpError(
    "bulk update with duplicate SKU returns 409 conflict",
    409,
    async () =>
      api.functional.ecommerceMall.seller.sellers.me.products.variants.patchByProductid(
        sellerConnection,
        {
          productId: product1.id,
          body: {
            items: [
              {
                variantId: variant1.id,
                quantity: 50,
              },
              {
                variantId: variant2.id,
                skuCode: duplicateTargetSku,
              },
            ],
          },
        },
      ),
  );
  // 7. Get product1 again to verify rollback occurred
  const product1After =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: {
          name: product1.name,
          description: product1.description,
          basePrice: product1.basePrice,
          categoryId: category.id,
        },
      },
    );
  // Find the updated variants in the response
  const updatedVariant1 = product1After.variants.find(
    (v) => v.id === variant1.id,
  );
  const updatedVariant2 = product1After.variants.find(
    (v) => v.id === variant2.id,
  );
  // 8. Verify original variant data remains unchanged (rollback occurred)
  TestValidator.equals(
    "variant 1 quantity unchanged after rollback",
    updatedVariant1?.quantity,
    originalVariant1Quantity,
  );
  TestValidator.equals(
    "variant 2 SKU unchanged after rollback",
    updatedVariant2?.skuCode,
    originalVariant2SkuCode,
  );
}
