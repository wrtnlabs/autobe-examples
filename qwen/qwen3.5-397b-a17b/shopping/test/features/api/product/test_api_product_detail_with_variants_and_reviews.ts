import api from "@ORGANIZATION/PROJECT-api";
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

/**
 * Test retrieving complete product information for a published product with variants.
 *
 * This test verifies the GET /shoppingMall/products/{productId} endpoint returns:
 * 1. Product basic information (name, description, base_price)
 * 2. All product images sorted by display_order (ascending)
 * 3. All non-deleted variants with SKU codes and option key-value pairs
 * 4. Seller shop information (shop_name, shop_description, logo_image_url)
 * 5. Category information
 * 6. Review statistics (averageRating, totalReviewCount, ratingDistribution)
 * 7. Variant stock quantities and price overrides
 */
export async function test_api_product_detail_with_variants_and_reviews(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID for product lookup
  const productId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve product detail
  const product = await api.functional.shoppingMall.products.at(connection, {
    productId,
  });
  // Validate complete product structure with typia
  typia.assert(product);
  // Validate product images are sorted by display_order (business logic validation)
  if (product.images.length > 1) {
    for (let i = 1; i < product.images.length; i++) {
      TestValidator.predicate(
        `images sorted by display_order: image[${i}].display_order >= image[${i - 1}].display_order`,
        () =>
          product.images[i].display_order >=
          product.images[i - 1].display_order,
      );
    }
  }
  // Validate variant options have unique keys per variant (business logic)
  for (const variant of product.variants) {
    const optionKeys = variant.options.map((opt) => opt.key);
    const uniqueKeys = new Set(optionKeys);
    TestValidator.equals(
      `variant ${variant.id} option keys are unique`,
      optionKeys.length,
      uniqueKeys.size,
    );
  }
  // Validate review statistics consistency (business logic)
  const distribution = product.reviewStatistic.ratingDistribution;
  const totalFromDistribution =
    distribution["1"] +
    distribution["2"] +
    distribution["3"] +
    distribution["4"] +
    distribution["5"];
  TestValidator.equals(
    "totalReviewCount matches sum of rating distribution",
    product.reviewStatistic.totalReviewCount,
    totalFromDistribution,
  );
  // Validate average rating calculation consistency (business logic)
  if (product.reviewStatistic.totalReviewCount > 0) {
    TestValidator.predicate(
      "averageRating is not null when reviews exist",
      () => product.reviewStatistic.averageRating !== null,
    );
  }
}
