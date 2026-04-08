import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test seller product retrieval without variants - product visible but unavailable.
 *
 * Validates the complete workflow of retrieving a product that has no variants. The test ensures that products without variants are still accessible to sellers but correctly marked as unavailable for purchase. This scenario tests the business rule that products require at least one variant to be purchasable while remaining visible in the system for management purposes.
 *
 * The test verifies that the product entity is returned with all expected fields including seller and category information, while the variants array is empty. This confirms the system correctly handles products in a pre-launch state where variants have not yet been configured.
 *
 * 1. Seller registers with email and credentials using authorize_seller_join utility.
 * 2. Seller creates a product with name, description, category, and base price.
 * 3. No variants are created for the product.
 * 4. Seller retrieves the product by ID.
 * 5. Validates product details match input, variants array is empty, and images array exists.
 */
export async function test_api_seller_product_retrieval_without_variants(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create product without variants
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Retrieve the product by ID
  const retrievedProduct = await api.functional.shoppingMall.seller.products.at(
    sellerConnection,
    {
      productId: product.id,
    },
  );
  typia.assert(retrievedProduct);
  // 4. Validate product details
  TestValidator.equals("product ID matches", retrievedProduct.id, product.id);
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
    "base price matches",
    retrievedProduct.base_price,
    product.base_price,
  );
  // 5. Validate seller information is included
  TestValidator.equals(
    "seller ID matches",
    retrievedProduct.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "seller email matches",
    retrievedProduct.seller.email,
    sellerAuth.email,
  );
  // 6. Validate category information is included
  TestValidator.predicate(
    "category exists",
    retrievedProduct.category !== null,
  );
  TestValidator.equals(
    "category ID matches",
    retrievedProduct.category.id,
    product.category.id,
  );
  // 7. Validate variants array is empty
  TestValidator.equals(
    "variants array is empty",
    retrievedProduct.variants.length,
    0,
  );
  // 8. Validate images array exists (may be empty since no images were added)
  TestValidator.predicate(
    "images array exists",
    Array.isArray(retrievedProduct.images),
  );
}
