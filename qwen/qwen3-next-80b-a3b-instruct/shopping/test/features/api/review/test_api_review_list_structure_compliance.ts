import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_structure_compliance(
  connection: api.IConnection,
) {
  // Generate request parameters for review list
  const requestParams = typia.random<IShoppingMallReview.IRequest>();

  // Call the API to get review list
  const response: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: requestParams,
    });

  // Validate the response structure matches the type definition
  typia.assert(response);

  // Validate that pagination information exists and has correct types
  TestValidator.equals(
    "pagination exists",
    response.pagination,
    response.pagination,
  );
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

  // Validate that data array exists
  TestValidator.predicate("data array exists", Array.isArray(response.data));

  // Validate each review in the data array is a string as per the IShoppingMallReview.ISummary type definition
  for (const review of response.data) {
    TestValidator.predicate("review is a string", typeof review === "string");
  }
}
