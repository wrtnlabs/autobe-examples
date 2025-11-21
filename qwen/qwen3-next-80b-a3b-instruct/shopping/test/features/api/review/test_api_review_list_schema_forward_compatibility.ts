import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_schema_forward_compatibility(
  connection: api.IConnection,
) {
  // Generate a random request that will trigger a response
  const request = typia.random<IShoppingMallReview.IRequest>();

  // Call the endpoint to get a response
  const response: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: request,
    });

  // Validate the response structure using typia.assert, which ensures
  // that the response matches the expected schema exactly
  typia.assert(response);

  // Verify that the data array exists and is an array of summaries (strings)
  TestValidator.predicate("data is an array", Array.isArray(response.data));
  TestValidator.predicate(
    "data items are summaries",
    response.data.every((item) => typeof item === "string"),
  );
}
