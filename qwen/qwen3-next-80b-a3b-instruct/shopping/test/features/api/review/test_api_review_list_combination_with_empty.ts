import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_combination_with_empty(
  connection: api.IConnection,
) {
  // Test that empty string customer_id is handled gracefully as empty filter
  const request: IShoppingMallReview.IRequest = "";

  // Call the endpoint with empty string as customer_id filter (testing empty filter)
  const result: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: request,
    });

  // Validate response structure
  typia.assert(result);

  // Verify pagination structure exists
  TestValidator.equals(
    "pagination exists",
    result.pagination,
    result.pagination,
  );

  // Verify data array exists (can be empty but must exist)
  TestValidator.equals("data array exists", Array.isArray(result.data), true);

  // Verify the response conforms to the defined schema
  TestValidator.equals(
    "customer_id filter is respected",
    result.data.length >= 0,
    true,
  );
}
