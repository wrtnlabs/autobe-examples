import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
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
 * Test retrieving product details for a product that has no variants.
 * Per business rules, products without variants are still visible in product
 * detail but should be shown as unavailable to customers. Verify the response
 * returns the product information with an empty variants array. The product
 * should be accessible but customers cannot add it to cart. This validates the
 * business rule that products must have at least one variant to be purchasable,
 * but remain visible for browsing. Ensure images, seller info, and review
 * statistics are still returned correctly.
 */
export async function test_api_product_without_variants_unavailable(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(sellerAuth);
  // 2. Create a product without variants using utility function
  // The utility function handles category creation internally via prepare_random_shopping_mall_product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.Maximum<100000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 3. Retrieve product detail using public endpoint (no authentication required)
  const retrievedProduct = await api.functional.shoppingMall.products.at(
    connection,
    {
      productId: product.id,
    },
  );
  typia.assert(retrievedProduct);
  // 4. Validate product has no variants (empty array) - key business rule
  TestValidator.equals(
    "product variants should be empty array",
    retrievedProduct.variants.length,
    0,
  );
  // 5. Verify product information is correctly returned
  TestValidator.equals("product id matches", retrievedProduct.id, product.id);
  TestValidator.equals(
    "product name matches",
    retrievedProduct.name,
    product.name,
  );
  TestValidator.equals(
    "base price matches",
    retrievedProduct.base_price,
    product.base_price,
  );
  // 6. Verify seller information is present and correct
  TestValidator.predicate("seller exists", retrievedProduct.seller !== null);
  TestValidator.equals(
    "seller id matches",
    retrievedProduct.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "seller shop name matches",
    retrievedProduct.seller.shop_name,
    sellerAuth.shop_name,
  );
  // 7. Verify category information is present
  TestValidator.predicate(
    "category exists",
    retrievedProduct.category !== null,
  );
  TestValidator.predicate(
    "category id exists",
    retrievedProduct.category.id !== null,
  );
  TestValidator.predicate(
    "category name exists",
    retrievedProduct.category.name !== null,
  );
  // 8. Verify review statistics are present with correct initial values
  TestValidator.predicate(
    "review statistic exists",
    retrievedProduct.reviewStatistic !== null,
  );
  TestValidator.predicate(
    "average rating is null for new product",
    retrievedProduct.reviewStatistic.averageRating === null,
  );
  TestValidator.equals(
    "total review count is zero",
    retrievedProduct.reviewStatistic.totalReviewCount,
    0,
  );
  TestValidator.equals(
    "rating distribution shows zero for all stars",
    retrievedProduct.reviewStatistic.ratingDistribution,
    { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
  );
  // 9. Verify timestamps are present and deleted_at is null
  TestValidator.predicate(
    "created_at exists",
    retrievedProduct.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedProduct.updated_at !== null,
  );
  TestValidator.equals(
    "deleted_at is null (product is active)",
    retrievedProduct.deleted_at,
    null,
  );
  // 10. Verify images array exists (may be empty)
  TestValidator.predicate(
    "images array exists",
    Array.isArray(retrievedProduct.images),
  );
}
