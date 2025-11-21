import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_status_present(
  connection: api.IConnection,
) {
  // Use a stringified JSON object as the request body, since IRequest is defined as string
  const requestBody: string = JSON.stringify({
    status: "published",
    sort_by: "created_at",
    sort_order: "desc",
    limit: 10,
    current: 1,
  });

  const response: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: requestBody,
    });
  typia.assert(response);

  TestValidator.predicate("data array exists", response.data.length > 0);

  for (const reviewSummary of response.data) {
    TestValidator.predicate(
      "review summary is a string",
      typeof reviewSummary === "string",
    );
    TestValidator.predicate(
      "review summary is not empty",
      reviewSummary.length > 0,
    );
  }
}
