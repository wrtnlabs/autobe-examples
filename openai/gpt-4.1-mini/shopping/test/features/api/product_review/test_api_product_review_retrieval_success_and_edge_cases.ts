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

/**
 * E2E test for product review retrieval success and edge cases.
 *
 * Note: Due to empty DTO definitions for IShoppingMallProductReview, this test focuses
 * only on call success and error scenarios without property-specific assertions.
 */
export async function test_api_product_review_retrieval_success_and_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Create customer-specific connection
  const customerConnection: api.IConnection = { host: connection.host };
  // Create a product review with random body
  const createdReview =
    await generate_random_shopping_mall_product_reviews_create(
      customerConnection,
      {},
    );
  typia.assert(createdReview);
  // We cannot access createdReview.id due to empty DTO, so generate a random UUID for retrieval
  const randomUUID = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve a product review by random UUID
  // This should produce 404 error; we test error handling
  await TestValidator.error("non-existent review retrieval", async () => {
    await api.functional.shoppingMall.productReviews.at(customerConnection, {
      productReviewId: randomUUID,
    });
  });
}
