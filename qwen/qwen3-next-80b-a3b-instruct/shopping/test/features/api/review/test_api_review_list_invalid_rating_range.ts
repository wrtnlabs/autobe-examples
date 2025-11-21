import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_invalid_rating_range(
  connection: api.IConnection,
) {
  // Create an invalid rating range where min_rating > max_rating as a JSON string
  const invalidRange: IShoppingMallReview.IRequest = JSON.stringify({
    min_rating: 5,
    max_rating: 3,
  });

  // Verify that the server returns a 400 error for invalid rating range
  await TestValidator.error(
    "server should reject min_rating > max_rating",
    async () => {
      await api.functional.shoppingMall.reviews.index(connection, {
        body: invalidRange,
      });
    },
  );
}
