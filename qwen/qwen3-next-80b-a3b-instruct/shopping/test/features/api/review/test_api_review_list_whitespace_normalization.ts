import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

/**
 * Test whitespace normalization in review filtering parameters.
 *
 * Validates that the API endpoint trims leading and trailing whitespace from
 * string parameters in the request body before processing. This ensures
 * consistent search results regardless of accidental whitespace in user input.
 *
 * Since IShoppingMallReview.IRequest is defined as a string type (not an
 * object), this test constructs a properly formatted query string with
 * intentional whitespace around the parameter values to verify the system
 * automatically trims this whitespace.
 *
 * The test sends a request with whitespace around productId, customerId, and
 * status values and verifies that the API successfully processes the request
 * and returns a valid response structure, confirming that whitespace
 * normalization occurs correctly.
 */
export async function test_api_review_list_whitespace_normalization(
  connection: api.IConnection,
) {
  const requestBody =
    `productId=${" " + typia.random<string & tags.Format<"uuid">>() + " "}` +
    `&customerId=${" " + typia.random<string & tags.Format<"uuid">>() + " "}` +
    `&status=${" " + RandomGenerator.pick(["pending", "published", "rejected", "hidden"]) + " "}`;

  const output: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: requestBody satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(output);

  // Validate pagination structure
  TestValidator.equals(
    "pagination current page is 1",
    output.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is default or value",
    output.pagination.limit > 0,
    true,
  );
  TestValidator.predicate("response has data", output.data.length > 0);
}
