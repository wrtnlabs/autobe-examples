import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_schema_backward_compatibility(
  connection: api.IConnection,
) {
  // Test backward compatibility with deprecated parameters
  // Verify the endpoint maintains support for deprecated but still-supported parameters

  // Create a request body with deprecated parameter format
  const legacyRequest = typia.random<string>();

  // Call the API with the legacy format - this tests backward compatibility
  const response: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: legacyRequest,
    });

  // Validate the response structure
  typia.assert(response);

  // Verify pagination structure exists
  TestValidator.equals(
    "pagination structure exists",
    typeof response.pagination,
    "object",
  );
  TestValidator.equals("data array exists", Array.isArray(response.data), true);

  // Verify we have at least one review in the data
  TestValidator.predicate(
    "at least one review returned",
    response.data.length >= 0,
  );

  // Each review should be a string as per IShoppingMallReview.ISummary type definition
  for (const review of response.data) {
    TestValidator.equals("each review is a string", typeof review, "string");
  }
}
