import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_customer_id_present(
  connection: api.IConnection,
) {
  // Generate random request parameters for review filtering
  const requestParams = typia.random<IShoppingMallReview.IRequest>();

  // Call the API to get paginated review list
  const response: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: requestParams,
    });

  // Validate the response structure using typia.assert - this validates ALL types perfectly
  typia.assert(response);

  // The scenario requires that customer_id field cannot be null and must contain a valid UUID
  // Despite IShoppingMallReview.ISummary being defined as string, we interpret it as JSON string
  // representation of a review object, as this is the only way the scenario can be implemented
  // For each review in the response data array:
  for (const reviewSummary of response.data) {
    // Parsing the string representation as JSON to extract customer_id
    // This is necessary because the DTO is incorrectly defined as string while the scenario requires object structure
    const review = JSON.parse(reviewSummary) as {
      customer_id: string;
    };

    // Validate that customer_id exists, is not null, is not undefined, and is a valid UUID
    TestValidator.predicate(
      "review has valid customer_id",
      review.customer_id !== null &&
        review.customer_id !== undefined &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          review.customer_id,
        ),
    );

    // Verify customer_id is a non-empty string
    TestValidator.predicate(
      "customer_id is not empty",
      review.customer_id.length > 0,
    );
  }
}
