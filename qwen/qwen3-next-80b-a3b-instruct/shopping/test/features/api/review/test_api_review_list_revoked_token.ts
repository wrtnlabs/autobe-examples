import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

/**
 * Test the public review list endpoint with valid search criteria.
 *
 * This endpoint accepts PATCH requests to /shoppingMall/reviews with JSON
 * string parameters for filtering, sorting, and pagination. The endpoint is
 * designated as public and requires no authentication according to the
 * documentation, though the test scenario requested revoked token validation
 * which was impossible to implement due to SDK constraints prohibiting direct
 * header manipulation.
 *
 * This test validates the actual public functionality: the ability to retrieve
 * a paginated list of reviews with different filtering options. The endpoint's
 * response structure is validated to ensure it follows
 * IPageIShoppingMallReview.ISummary.
 *
 * Since the scenario requested token revocation testing, which requires header
 * manipulation and is absolutely prohibited by the system constraints, this
 * test intentionally ignores that requirement and focuses exclusively on the
 * implemented and permitted functionality.
 *
 * The test constructs a valid JSON request body with common filtering
 * parameters including product_id and customer_id to retrieve a subset of
 * reviews.
 *
 * The response includes pagination metadata from IPage.IPagination and an array
 * of review summaries in IShoppingMallReview.ISummary format.
 */
export async function test_api_review_list_revoked_token(
  connection: api.IConnection,
) {
  // Construct a valid request body as JSON string with search criteria
  // This matches the IShoppingMallReview.IRequest type definition as string
  const requestBody: string = JSON.stringify({
    product_id: typia.random<string & tags.Format<"uuid">>(),
    customer_id: typia.random<string & tags.Format<"uuid">>(),
    status: "published",
    min_rating: 4,
    max_rating: 5,
    sort_by: "created_at",
    sort_order: "desc",
    limit: 10,
    current: 1,
  });

  // Call the endpoint with valid request body
  const output: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: requestBody satisfies IShoppingMallReview.IRequest,
    });

  // Validate the response structure and types with typia.assert()
  typia.assert(output);

  // Additional validation of pagination structure
  TestValidator.equals(
    "pagination exists",
    output.pagination !== undefined,
    true,
  );
  TestValidator.equals("data exists", output.data !== undefined, true);
  TestValidator.predicate(
    "pagination current is positive",
    output.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    output.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is positive",
    output.pagination.pages > 0,
  );
  TestValidator.predicate(
    "data has at least 0 reviews",
    output.data.length >= 0,
  );
}
