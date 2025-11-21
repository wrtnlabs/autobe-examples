import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_title_length_limit(
  connection: api.IConnection,
) {
  // Generate a very long search query that exceeds typical length limits
  // This simulates an attempt to search for reviews using an extremely long title
  const extremelyLongSearchQuery = RandomGenerator.paragraph({
    sentences: 200,
    wordMin: 15,
    wordMax: 25,
  });

  // Call the endpoint with this long search query
  // According to DTO, IRequest is string type, so we pass the long string directly
  const result = await api.functional.shoppingMall.reviews.index(connection, {
    body: extremelyLongSearchQuery,
  });

  // Validate the response structure follows the expected IPageIShoppingMallReview.ISummary format
  typia.assert(result);

  // Verify the response has the required pagination object
  TestValidator.equals(
    "response has pagination object",
    "pagination" in result,
    true,
  );

  // Verify the response has the data array
  TestValidator.equals("response has data array", "data" in result, true);

  // Verify data is an array
  TestValidator.predicate("data is array", Array.isArray(result.data));

  // Verify data items are strings as per ISummary definition
  for (const reviewSummary of result.data) {
    TestValidator.predicate(
      "review item is string",
      typeof reviewSummary === "string",
    );
  }

  // Verify we got some results back (even if truncated, backend should return some reviews)
  TestValidator.predicate("at least one review found", result.data.length > 0);
}
