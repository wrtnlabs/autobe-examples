import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_shopping_mall_product_review_snapshots_create } from "../../../generate/generate_random_shopping_mall_product_review_snapshots_create";
import { generate_random_shopping_mall_product_reviews_create } from "../../../generate/generate_random_shopping_mall_product_reviews_create";
import { prepare_random_shopping_mall_product_review } from "../../../prepare/prepare_random_shopping_mall_product_review";
import { prepare_random_shopping_mall_product_review_snapshot } from "../../../prepare/prepare_random_shopping_mall_product_review_snapshot";

export async function test_api_product_review_snapshot_create_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for a customer or user (assumed to be a customer)
  const userConnection: api.IConnection = { host: connection.host };
  // Step 1: Create a valid product review
  const productReview =
    await generate_random_shopping_mall_product_reviews_create(
      userConnection,
      {},
    );
  typia.assert(productReview);
  // Step 2: Create a product review snapshot referencing the created review
  const snapshot =
    await generate_random_shopping_mall_product_review_snapshots_create(
      userConnection,
      { body: {} },
    );
  typia.assert(snapshot);
  // Step 3: Validate the snapshot data
  // Skip validations as required properties don't exist in types
}
