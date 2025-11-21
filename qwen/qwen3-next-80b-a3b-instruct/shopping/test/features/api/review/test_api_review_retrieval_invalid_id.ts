import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_retrieval_invalid_id(
  connection: api.IConnection,
) {
  // Generate a random UUID that is highly unlikely to exist in the system
  const invalidReviewId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to retrieve the non-existent review
  await TestValidator.error(
    "should return 404 for non-existent review ID",
    async () => {
      await api.functional.shoppingMall.reviews.at(connection, {
        reviewId: invalidReviewId,
      });
    },
  );
}
