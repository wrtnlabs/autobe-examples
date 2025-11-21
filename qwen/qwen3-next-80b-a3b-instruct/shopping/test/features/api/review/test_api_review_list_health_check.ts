import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_health_check(
  connection: api.IConnection,
) {
  // Send empty request body to health check endpoint
  const response: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: "" satisfies IShoppingMallReview.IRequest,
    });

  // Validate response structure with typia.assert
  typia.assert(response);

  // Validate pagination metadata
  TestValidator.equals(
    "pagination current should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be default (10)",
    response.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination records should be 0",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0",
    response.pagination.pages,
    0,
  );

  // Validate data array is empty
  TestValidator.equals("data array should be empty", response.data.length, 0);
}
