import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductReviewRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewRating";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_rating_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Use a non-existent product ID (valid UUID format but doesn't exist in database)
  const nonExistentProductId = "00000000-0000-0000-0000-000000000000";
  // Expect HTTP 404 Not Found error for non-existent product
  await TestValidator.httpError(
    "should return 404 for non-existent product",
    404,
    async () => {
      await api.functional.shoppingMall.products.rating.at(connection, {
        productId: nonExistentProductId,
      });
    },
  );
}
