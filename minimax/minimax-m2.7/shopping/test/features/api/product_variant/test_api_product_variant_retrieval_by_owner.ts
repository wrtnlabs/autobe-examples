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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

/**
 * Test retrieving a product variant by authenticated seller (owner).
 *
 * Validates that an authenticated seller can successfully retrieve details of a product variant
 * that belongs to their own product. Verifies the complete variant information including SKU code,
 * price override, option values, stock quantity, and timestamps are correctly returned.
 *
 * 1. Seller authenticates via join endpoint with specified credentials.
 * 2. Seller creates a product with required fields (name, description, category, basePrice).
 * 3. Seller creates a variant with custom SKU, price override, and multiple option values.
 * 4. Seller retrieves the variant using GET endpoint with product and variant IDs.
 * 5. Validates response matches expected values including correct price override.
 *
 * Business rules verified:
 * - Only product owner can retrieve variant details (ownership verification)
 * - Variant returns complete option values array with all key-value pairs
 * - Price override (109.99) is correctly returned instead of product base price (99.99)
 * - Default stock quantity is 0 when no inventory has been added
 * - deletedAt is null for active variants
 */
export async function test_api_product_variant_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create product
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: {
          name: "Running Shoes",
          description: "Comfortable running shoes",
          basePrice: 99.99,
          categoryId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(product);
  // 3. Create variant
  const variant =
    await generate_random_ecommerce_mall_seller_sellers_me_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          skuCode: "SHOE-BLUE-42",
          price: 109.99,
          optionValues: [
            { key: "Color", value: "Blue" },
            { key: "Size", value: "42" },
          ],
        },
      },
    );
  typia.assert(variant);
  // 4. Retrieve variant
  const retrievedVariant =
    await api.functional.ecommerceMall.seller.sellers.me.products.variants.getByProductidAndVariantid(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
      },
    );
  typia.assert(retrievedVariant);
  // 5. Validate response
  TestValidator.equals("variant id matches", retrievedVariant.id, variant.id);
  TestValidator.equals(
    "sku code matches",
    retrievedVariant.skuCode,
    "SHOE-BLUE-42",
  );
  TestValidator.equals(
    "price override applied",
    retrievedVariant.price,
    109.99,
  );
  TestValidator.equals("default quantity is 0", retrievedVariant.quantity, 0);
  TestValidator.predicate(
    "has option values",
    retrievedVariant.optionValues.length === 2,
  );
  TestValidator.equals(
    "color option exists",
    retrievedVariant.optionValues.find((v) => v.key === "Color")?.value,
    "Blue",
  );
  TestValidator.equals(
    "size option exists",
    retrievedVariant.optionValues.find((v) => v.key === "Size")?.value,
    "42",
  );
  TestValidator.equals("deletedAt is null", retrievedVariant.deletedAt, null);
  TestValidator.predicate(
    "has valid createdAt",
    (retrievedVariant.createdAt?.length ?? 0) > 0,
  );
  TestValidator.predicate(
    "has valid updatedAt",
    (retrievedVariant.updatedAt?.length ?? 0) > 0,
  );
}
