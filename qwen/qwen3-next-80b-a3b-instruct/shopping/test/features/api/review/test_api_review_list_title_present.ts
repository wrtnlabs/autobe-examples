import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_title_present(
  connection: api.IConnection,
) {
  // Generate random request params for review filtering
  const requestParams = typia.random<IShoppingMallReview.IRequest>();

  // Call the review list endpoint to retrieve paginated reviews
  const result: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: requestParams,
    });

  // Validate the response structure
  typia.assert(result);

  // Verify that every review in the data array is a non-null, non-empty string
  for (const review of result.data) {
    TestValidator.predicate(
      "review title is present and not empty",
      typeof review === "string" && review.length > 0,
    );
  }
}
