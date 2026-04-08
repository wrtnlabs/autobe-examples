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
 * Test retrieving a product without variants to verify availability rules.
 *
 * Validates that products without any variants are properly displayed but marked
 * as unavailable for purchase. This test ensures the business rule that products
 * without variants have an empty variants array, inStock=false, and priceRange
 * reflects only the base price.
 *
 * The test flow creates a seller, authenticates them, and has them create a product
 * without any variants. Then retrieves the product via public endpoint and validates
 * that all computed fields (inStock, priceRange) correctly reflect the absence of
 * variants. Rating fields should be null/zero for a new product with no reviews.
 *
 * 1. Admin creates a product category (required for product creation).
 * 2. Seller registers with email/password credentials.
 * 3. Seller authenticates to obtain session tokens.
 * 4. Seller creates a product with base price but no variants.
 * 5. Retrieve product via public GET endpoint.
 * 6. Validate variants array is empty and inStock is false.
 * 7. Validate priceRange matches base_price (min=max=base_price).
 * 8. Validate rating fields are null/zero for product with no reviews.
 */
export async function test_api_product_retrieval_without_variants(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication and category creation
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller registration
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Seller authentication
  const sellerAuth = await api.functional.ecommerceMall.auth.seller.login(
    sellerConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(sellerAuth);
  // 4. Seller creates product without variants
  const basePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          basePrice: basePrice,
          categoryId: category.id,
        },
      },
    );
  typia.assert(product);
  // 5. Retrieve product via public endpoint
  const retrievedProduct = await api.functional.ecommerceMall.products.at(
    connection,
    {
      productId: product.id,
    },
  );
  typia.assert(retrievedProduct);
  // 6. Validate product data
  TestValidator.equals("product id matches", retrievedProduct.id, product.id);
  TestValidator.equals("name matches", retrievedProduct.name, product.name);
  TestValidator.equals(
    "description matches",
    retrievedProduct.description,
    product.description,
  );
  TestValidator.equals(
    "base price matches",
    retrievedProduct.basePrice,
    product.basePrice,
  );
  // 7. Validate variants array is empty
  TestValidator.equals(
    "variants array is empty",
    retrievedProduct.variants.length,
    0,
  );
  // 8. Validate inStock is false (no variants with quantity > 0)
  TestValidator.equals("inStock is false", retrievedProduct.inStock, false);
  // 9. Validate priceRange matches base_price
  TestValidator.equals(
    "priceRange min equals base_price",
    retrievedProduct.priceRange.min,
    basePrice,
  );
  TestValidator.equals(
    "priceRange max equals base_price",
    retrievedProduct.priceRange.max,
    basePrice,
  );
  TestValidator.equals(
    "priceRange min equals max",
    retrievedProduct.priceRange.min,
    retrievedProduct.priceRange.max,
  );
  // 10. Validate rating fields for product with no reviews
  TestValidator.equals(
    "rating average is null",
    retrievedProduct.ratingAverage,
    null,
  );
  TestValidator.equals("rating count is 0", retrievedProduct.ratingCount, 0);
  // 11. Validate seller and category information is present
  TestValidator.predicate(
    "seller info present",
    retrievedProduct.seller !== null,
  );
  TestValidator.predicate(
    "category info present",
    retrievedProduct.category !== null,
  );
  // 12. Validate images array is present (may be empty or have items)
  TestValidator.predicate(
    "images array exists",
    Array.isArray(retrievedProduct.images),
  );
  // 13. Validate timestamps are present
  TestValidator.predicate(
    "createdAt is present",
    retrievedProduct.createdAt !== undefined,
  );
  TestValidator.predicate(
    "updatedAt is present",
    retrievedProduct.updatedAt !== undefined,
  );
  TestValidator.equals("deletedAt is null", retrievedProduct.deletedAt, null);
}
