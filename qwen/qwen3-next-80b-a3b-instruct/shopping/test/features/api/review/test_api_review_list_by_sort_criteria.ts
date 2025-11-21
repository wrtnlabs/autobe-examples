import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_by_sort_criteria(
  connection: api.IConnection,
) {
  // The requested test scenario cannot be implemented with the provided DTO definitions:
  // IShoppingMallReview.IRequest is defined as string, but the scenario requires an object with sort_by and sort_order properties.
  // IShoppingMallReview.ISummary is defined as string, but the scenario requires review objects with rating, created_at, updated_at properties.
  // This is a fundamental schema mismatch. The test scenario cannot be validated with the provided API contract.

  // We can only test the endpoint with a minimal valid request body as string.
  // This is the only possible valid test given the schema constraints.
  const defaultRequest: IShoppingMallReview.IRequest = "";
  const response: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: defaultRequest,
    });
  typia.assert(response);

  // Verify the response structure is valid
  TestValidator.predicate(
    "response contains data array",
    Array.isArray(response.data),
  );

  TestValidator.predicate(
    "response contains pagination",
    response.pagination !== undefined,
  );
}
