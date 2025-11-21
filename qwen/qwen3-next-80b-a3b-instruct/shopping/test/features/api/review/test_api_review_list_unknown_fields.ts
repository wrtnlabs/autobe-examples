import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_unknown_fields(
  connection: api.IConnection,
) {
  // Generate a string-based IRequest with known query parameters and unknown fields
  // The schema defines IRequest as string, likely URL-encoded parameters
  const productId = typia.random<string & tags.Format<"uuid">>();
  const limit = 10;
  const page = 1;

  // Create base string with known parameters
  const baseUrl = `product_id=${encodeURIComponent(productId)}&limit=${limit}&page=${page}`;

  // Append unknown fields in URL query format (as per ignore behavior requirement)
  // These are unknown to the schema but will be ignored by the backend
  const unknownQuery =
    "&unknown_property_1=this%20should%20be%20ignored&unknown_property_2=12345&unknown_property_3=%7B%22nested%22%3A%22value%22%2C%22another%22%3Atrue%7D&unknown_property_4=%5B%22array%22%2C%22item%22%2C%22should%22%2C%22be%22%2C%22ignored%22%5D&unknown_property_5=null";

  // Combine to create the complete string request body
  const requestString = baseUrl + unknownQuery;

  // This is a string as required by IShoppingMallReview.IRequest
  const request: IShoppingMallReview.IRequest = requestString;

  // Call the endpoint with unknown fields
  const response: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: request,
    });

  // Validate the response is correctly formatted
  typia.assert(response);

  // Verify pagination properties
  TestValidator.equals(
    "pagination.current should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit should be 10",
    response.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination.records should be >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages should be >= 0",
    response.pagination.pages >= 0,
  );

  // Verify data array structure
  TestValidator.predicate(
    "data should be an array",
    Array.isArray(response.data),
  );

  // Verify each item in data array has the correct structure
  for (const item of response.data) {
    TestValidator.predicate(
      "each item should be a string",
      typeof item === "string",
    );
  }
}
