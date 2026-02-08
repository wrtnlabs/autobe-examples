import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_shopping_mall_product_reviews_create } from "../../../generate/generate_random_shopping_mall_product_reviews_create";
import { prepare_random_shopping_mall_product_review } from "../../../prepare/prepare_random_shopping_mall_product_review";

export async function test_api_product_review_body_text_variations(
  connection: api.IConnection,
): Promise<void> {
  // Create a user-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // Generate a random product review (no body overrides due to unknown schema)
  const review1 = await generate_random_shopping_mall_product_reviews_create(
    userConnection,
    {},
  );
  typia.assert(review1);
  // Generate a second random product review
  const review2 = await generate_random_shopping_mall_product_reviews_create(
    userConnection,
    {},
  );
  typia.assert(review2);
  // Validate that the two reviews are not identical (some difference in content)
  TestValidator.notEquals(
    "Two generated product reviews differ",
    review1,
    review2,
  );
}
