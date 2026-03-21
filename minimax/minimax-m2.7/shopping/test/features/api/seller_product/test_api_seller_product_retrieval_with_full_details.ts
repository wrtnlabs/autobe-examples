import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_seller_product_retrieval_with_full_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as an approved seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create a product with required fields
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Retrieve the product with full details
  const retrievedProduct =
    await api.functional.ecommerceMall.seller.products.at(sellerConnection, {
      productId: product.id,
    });
  typia.assert(retrievedProduct);
  // 4. Validate product structure and nested relationships
  // Validate basic product fields
  TestValidator.equals("product id matches", retrievedProduct.id, product.id);
  TestValidator.equals(
    "product name matches",
    retrievedProduct.name,
    product.name,
  );
  TestValidator.equals(
    "product description matches",
    retrievedProduct.description,
    product.description,
  );
  TestValidator.equals(
    "product base_price matches",
    retrievedProduct.base_price,
    product.base_price,
  );
  // Validate seller shop profile (nested relationship)
  TestValidator.predicate(
    "seller profile exists",
    retrievedProduct.seller !== null,
  );
  TestValidator.predicate(
    "seller has name",
    retrievedProduct.seller.name.length > 0,
  );
  TestValidator.predicate(
    "seller has valid id",
    retrievedProduct.seller.id !== undefined,
  );
  // Validate category information (nested relationship)
  TestValidator.predicate(
    "category exists",
    retrievedProduct.category !== null,
  );
  TestValidator.equals(
    "category name matches",
    retrievedProduct.category.name,
    product.category.name,
  );
  TestValidator.predicate(
    "category has valid id",
    retrievedProduct.category.id !== undefined,
  );
  // Validate product images array (ordered by display_order)
  TestValidator.predicate(
    "product_images is array",
    Array.isArray(retrievedProduct.product_images),
  );
  for (let i = 0; i < retrievedProduct.product_images.length; i++) {
    const image = retrievedProduct.product_images[i];
    TestValidator.predicate(`image ${i} has valid id`, image.id !== undefined);
    TestValidator.predicate(
      `image ${i} has valid url`,
      image.image_url.length > 0,
    );
    TestValidator.predicate(
      `image ${i} has valid display_order`,
      image.display_order === i,
    );
  }
  // Validate variants array (active variants with option key-value pairs)
  TestValidator.predicate(
    "variants is array",
    Array.isArray(retrievedProduct.variants),
  );
  for (const variant of retrievedProduct.variants) {
    TestValidator.predicate("variant has valid id", variant.id !== undefined);
    TestValidator.predicate(
      "variant has valid sku_code",
      variant.sku_code.length > 0,
    );
    TestValidator.predicate(
      "variant has quantity",
      typeof variant.quantity === "number",
    );
    TestValidator.predicate(
      "variant has optionValues array",
      Array.isArray(variant.optionValues),
    );
    // Validate option key-value pairs
    for (const optionValue of variant.optionValues) {
      TestValidator.predicate(
        "option value has valid key",
        optionValue.key.length > 0,
      );
      TestValidator.predicate(
        "option value has valid value",
        optionValue.value.length > 0,
      );
    }
  }
  // Validate review statistics (aggregated)
  TestValidator.predicate(
    "average_rating is number",
    typeof retrievedProduct.average_rating === "number",
  );
  TestValidator.predicate(
    "reviews_count is number",
    typeof retrievedProduct.reviews_count === "number",
  );
  TestValidator.predicate(
    "reviews_count is non-negative",
    retrievedProduct.reviews_count >= 0,
  );
  // If there are reviews, average rating should be between 1 and 5
  if (retrievedProduct.reviews_count > 0) {
    TestValidator.predicate(
      "average rating within valid range",
      retrievedProduct.average_rating >= 1 &&
        retrievedProduct.average_rating <= 5,
    );
  }
  // Validate reviews array (non-deleted reviews with customer display names)
  TestValidator.predicate(
    "reviews is array",
    Array.isArray(retrievedProduct.reviews),
  );
  TestValidator.equals(
    "reviews count matches",
    retrievedProduct.reviews.length,
    retrievedProduct.reviews_count,
  );
  for (const review of retrievedProduct.reviews) {
    TestValidator.predicate("review has valid id", review.id !== undefined);
    TestValidator.predicate(
      "review has valid rating",
      review.rating >= 1 && review.rating <= 5,
    );
    TestValidator.predicate(
      "review has valid created_at",
      review.created_at !== undefined,
    );
    TestValidator.predicate(
      "review has customer info",
      review.customer !== null,
    );
    TestValidator.predicate("review has product info", review.product !== null);
  }
  // Validate timestamps
  TestValidator.predicate(
    "has valid created_at",
    retrievedProduct.created_at !== undefined,
  );
  TestValidator.predicate(
    "has valid updated_at",
    retrievedProduct.updated_at !== undefined,
  );
  TestValidator.predicate(
    "is not deleted",
    retrievedProduct.deleted_at === null,
  );
}
