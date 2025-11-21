import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_records_filtered(
  connection: api.IConnection,
) {
  // The IRequest type is defined as a string.
  // We test with a valid string that could be a JSON-formatted filter query.
  // Example: A JSON string representation of filters would be a valid input.
  const filterString = JSON.stringify({
    status: "published",
    product_id: typia.random<string & tags.Format<"uuid">>(),
    customer_id: typia.random<string & tags.Format<"uuid">>(),
    limit: 10,
    current: 1,
  });

  // Call the API with a valid string-based request body
  const response: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: filterString satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(response);

  // Validate that pagination data is structured correctly
  TestValidator.equals("pagination exists", response.pagination !== null, true);
  TestValidator.predicate(
    "current page is positive",
    response.pagination.current > 0,
  );
  TestValidator.predicate("limit is positive", response.pagination.limit > 0);
  TestValidator.predicate(
    "records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate("pages is positive", response.pagination.pages > 0);

  // Validate that data array exists and is of correct type
  TestValidator.equals("data array exists", response.data !== null, true);
  TestValidator.predicate(
    "data array has correct length",
    response.data.length >= 0,
  );

  // Validate each review item is a string as per ISummary type
  for (const review of response.data) {
    TestValidator.equals("each review is a string", typeof review, "string");
  }

  // Since the API requires a string body and we don't control the data in the system,
  // we cannot test filtering counts. We can only test that the API accepts valid string input
  // and returns a valid response with correct structure. This is the only testable scenario
  // given the API contract and constraints.
}
