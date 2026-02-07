import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductReviewRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewRating";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_rating_zero_reviews(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random product ID for testing
  const productId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve product rating for a product with no reviews
  const rating = await api.functional.shoppingMall.products.rating.at(
    connection,
    {
      productId: productId,
    },
  );
  // Validate the response structure
  typia.assert(rating);
}
