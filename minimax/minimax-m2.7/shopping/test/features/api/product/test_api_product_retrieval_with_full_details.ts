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
 * Test retrieving a product with complete details including seller profile information, category assignment, and calculated rating statistics.
 *
 * Validates the GET /products/{productId} endpoint which returns comprehensive product information including the product name, description, base price, category details, seller profile with shop information, product images, variants, and calculated rating data. This test ensures that when a product is retrieved, all related data is properly joined and returned in a single response.
 *
 * The test flow involves:
 * 1. Administrator creates a product category for product assignment
 * 2. Seller registers and authenticates to create a product listing
 * 3. Seller creates a product with all required fields (name, description, base price, category)
 * 4. System retrieves the product using the public products endpoint
 * 5. Response is validated for correct data structure and values
 *
 * Validated fields include: id (UUID format), name, description, basePrice, inStock (computed from variants), priceRange (min/max from variants or base price), ratingAverage, ratingCount, seller profile, category summary, images array, variants array, createdAt, updatedAt timestamps, and deletedAt (null for active products).
 */
export async function test_api_product_retrieval_with_full_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates a category for the product
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller registers and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 3. Seller creates a product with base price and description
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 3 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          categoryId: category.id,
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(product);
  // 4. Retrieve the product with full details
  const retrievedProduct = await api.functional.ecommerceMall.products.at(
    connection,
    {
      productId: product.id,
    },
  );
  typia.assert(retrievedProduct);
  // 5. Validate response contains all required fields
  TestValidator.equals("product id matches", retrievedProduct.id, product.id);
  TestValidator.equals(
    "product name matches",
    retrievedProduct.name,
    product.name,
  );
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
  // Category validation
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
  // Seller profile validation
  TestValidator.equals(
    "seller profile exists",
    !!retrievedProduct.seller,
    true,
  );
  // Price range - since no variants, should equal base price
  TestValidator.equals(
    "price range min equals base price",
    retrievedProduct.priceRange.min,
    product.basePrice,
  );
  TestValidator.equals(
    "price range max equals base price",
    retrievedProduct.priceRange.max,
    product.basePrice,
  );
  // Stock status - no variants means out of stock
  TestValidator.equals(
    "inStock is false (no variants)",
    retrievedProduct.inStock,
    false,
  );
  // Rating data - should be null/zero since no reviews
  TestValidator.equals("rating count is 0", retrievedProduct.ratingCount, 0);
  // Arrays should be empty (no images or variants)
  TestValidator.equals(
    "images array exists",
    Array.isArray(retrievedProduct.images),
    true,
  );
  TestValidator.equals(
    "variants array exists",
    Array.isArray(retrievedProduct.variants),
    true,
  );
  // Timestamps should exist
  TestValidator.equals("createdAt exists", !!retrievedProduct.createdAt, true);
  TestValidator.equals("updatedAt exists", !!retrievedProduct.updatedAt, true);
  TestValidator.equals("deletedAt is null", retrievedProduct.deletedAt, null);
}
