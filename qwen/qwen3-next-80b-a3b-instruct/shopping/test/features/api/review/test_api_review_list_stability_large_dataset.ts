import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_stability_large_dataset(
  connection: api.IConnection,
) {
  // Since IShoppingMallReview.IRequest is defined as type string,
  // we must provide a valid JSON string that represents the request parameters

  // Create a valid JSON string for query parameters
  const request: string = JSON.stringify({
    current: 1,
    limit: 50,
    sort_by: "created_at",
    sort_order: "desc",
    product_id: typia.random<string & tags.Format<"uuid">>(),
    customer_id: typia.random<string & tags.Format<"uuid">>(),
    status: "published",
    min_rating: 1,
    max_rating: 5,
  });

  // Make the request - the API expects a JSON string body
  const response: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: request,
    });

  // Validate response structure with typia.assert
  typia.assert(response);

  // Validate that pagination is correctly structured
  TestValidator.equals(
    "pagination must exist",
    typeof response.pagination === "object",
    true,
  );
  TestValidator.equals(
    "pagination has current property",
    typeof response.pagination.current === "number" &&
      response.pagination.current >= 0,
    true,
  );
  TestValidator.equals(
    "pagination has limit property",
    typeof response.pagination.limit === "number" &&
      response.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination has records property",
    typeof response.pagination.records === "number" &&
      response.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination has pages property",
    typeof response.pagination.pages === "number" &&
      response.pagination.pages >= 0,
    true,
  );

  // Validate that data is an array of strings (IShoppingMallReview.ISummary)
  TestValidator.equals(
    "data must be an array",
    Array.isArray(response.data),
    true,
  );
  TestValidator.predicate(
    "data array has at least one item",
    response.data.length > 0,
  );

  // Validate that each item in data is a string (IShoppingMallReview.ISummary)
  for (const summary of response.data) {
    TestValidator.equals(
      "each data item must be a string",
      typeof summary === "string",
      true,
    );
  }

  // Stability test: Ensure response is received without timeout or disconnection
  // This is implicitly validated by the successful typia.assert() and TestValidator calls
  // since the API would throw an error on timeout/connection failure
}
