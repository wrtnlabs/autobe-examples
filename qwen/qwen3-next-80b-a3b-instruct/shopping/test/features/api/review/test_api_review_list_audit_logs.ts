import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_audit_logs(
  connection: api.IConnection,
) {
  const request = typia.random<IShoppingMallReview.IRequest>();

  const response: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: request,
    });

  typia.assert(response);

  // Validate that response conforms to IPageIShoppingMallReview.ISummary schema
  // Only validation needed is type structure validation by typia.assert()
  // ISummary is defined as string, so no property-level validation is possible or needed

  // Verify pagination exists and has correct structure
  TestValidator.predicate(
    "pagination exists",
    response.pagination !== undefined,
  );
  TestValidator.predicate("data array exists", Array.isArray(response.data));

  // Validate that each item in data array is a string (as per ISummary = string)
  response.data.forEach((review) => {
    TestValidator.equals("each review is a string", typeof review, "string");
  });
}
