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
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test retrieving product variants for the authenticated seller's own product.
 *
 * Validates the product variant list retrieval functionality for an authenticated seller.
 * This test verifies that when a seller retrieves variants for their own product via
 * GET /ecommerceMall/seller/sellers/me/products/{productId}/variants, the response
 * contains all active variants sorted by creation date (newest first).
 *
 * Test Flow:
 * 1. Administrator creates a category for product assignment.
 * 2. Seller registers and authenticates on the platform.
 * 3. Seller creates a product with multiple variants (color/size combinations).
 * 4. Seller retrieves variants for the created product.
 * 5. Validates that all variants are returned with correct structure, timestamps, and option values.
 *
 * Validation Focus:
 * - Variants are sorted by creation date (newest first).
 * - Each variant includes: id, skuCode, price (if set), quantity, timestamps.
 * - Each variant contains option key-value pairs for distinguishing variants.
 * - Variant count matches expected number of created variants.
 */
export async function test_api_product_variant_list_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates a category for product assignment
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller registers on the platform
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Seller authenticates (note: seller may need approval depending on system config)
  const sellerAuthConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  // Re-register and login
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  await authorize_seller_login(sellerAuthConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Seller creates a product with the category
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerAuthConnection,
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
  // 5. Retrieve variants for the product
  const variants =
    await api.functional.ecommerceMall.seller.sellers.me.products.variants.getByProductid(
      sellerAuthConnection,
      {
        productId: product.id,
      },
    );
  // 6. Validate response structure
  const variantList = typia.assert<IEcommerceMallProductVariant[]>(variants);
  // Validate variants is an array
  TestValidator.equals(
    "variants should be an array",
    Array.isArray(variantList),
    true,
  );
  // Validate that variants are returned (at least the product's variants)
  // The count should match the created product's variants array
  TestValidator.equals(
    "variant count should match product variants",
    variantList.length,
    product.variants.length,
  );
  // Validate sorting - newest first (createdAt descending)
  for (let i = 1; i < variantList.length; i++) {
    const prev = new Date(variantList[i - 1].createdAt).getTime();
    const curr = new Date(variantList[i].createdAt).getTime();
    TestValidator.predicate(
      `variant[${i}] should be older or equal to variant[${i - 1}]`,
      prev >= curr,
    );
  }
  // Validate each variant has required fields
  for (const variant of variantList) {
    // SKU code validation
    TestValidator.predicate(
      "variant should have valid skuCode",
      variant.skuCode.length > 0,
    );
    // Quantity validation
    TestValidator.predicate(
      "variant should have non-negative quantity",
      variant.quantity >= 0,
    );
    // Timestamps validation
    TestValidator.predicate(
      "variant should have valid createdAt",
      variant.createdAt.length > 0,
    );
    TestValidator.predicate(
      "variant should have valid updatedAt",
      variant.updatedAt.length > 0,
    );
    // Option values validation
    TestValidator.predicate(
      "variant should have option values array",
      Array.isArray(variant.optionValues),
    );
    TestValidator.predicate(
      "variant should have at least one option value",
      variant.optionValues.length > 0,
    );
    // Validate option key-value structure
    for (const opt of variant.optionValues) {
      TestValidator.predicate(
        "option key should not be empty",
        opt.key.length > 0,
      );
      TestValidator.predicate(
        "option value should not be empty",
        opt.value.length > 0,
      );
    }
  }
  // Validate variants are distinguished by different options
  const variantSignatures = variantList.map((v: IEcommerceMallProductVariant) =>
    v.optionValues
      .map((o: IEcommerceMallProductVariantOptionValue) => `${o.key}:${o.value}`)
      .sort()
      .join("|"),
  );
  const uniqueSignatures = new Set(variantSignatures);
  TestValidator.equals(
    "all variants should have unique option combinations",
    uniqueSignatures.size,
    variantList.length,
  );
}