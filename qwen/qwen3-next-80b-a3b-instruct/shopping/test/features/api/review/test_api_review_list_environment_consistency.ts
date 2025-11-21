import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_environment_consistency(
  connection: api.IConnection,
) {
  // Generate random request parameters for review filtering and pagination
  const request: IShoppingMallReview.IRequest =
    typia.random<IShoppingMallReview.IRequest>();

  // Call the PATCH /shoppingMall/reviews endpoint with the generated request
  const response: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: request,
    });

  // Validate the response structure and types to ensure environment consistency
  typia.assert(response);
}
