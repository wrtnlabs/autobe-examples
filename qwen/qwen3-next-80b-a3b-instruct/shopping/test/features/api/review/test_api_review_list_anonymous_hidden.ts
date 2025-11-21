import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_anonymous_hidden(
  connection: api.IConnection,
) {
  const nonExistentProductId = typia.random<string & tags.Format<"uuid">>();

  // Construct a valid IRequest JSON string query
  const requestBody = JSON.stringify({
    product_id: nonExistentProductId,
  });

  // Call API with valid IRequest string body
  const response: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: requestBody,
    });

  typia.assert(response);

  // Verify the API returns empty data array for non-existent product_id
  TestValidator.equals(
    "no reviews should be returned for non-existent product",
    response.data.length,
    0,
  );
}
