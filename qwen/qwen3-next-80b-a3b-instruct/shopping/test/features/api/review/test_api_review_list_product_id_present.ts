import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_product_id_present(
  connection: api.IConnection,
) {
  const testProductId = typia.random<string & tags.Format<"uuid">>();

  // Use a dummy request body for the index endpoint (as IRequest is string type)
  const request: string = testProductId;

  // Make the API call to retrieve reviews
  const response: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: request,
    });

  // Validate the entire response structure using typia.assert() - this validates all structure, types, and formats
  typia.assert(response);

  // Since every review in data is type string & tags.Format<'uuid'>,
  // typia.assert() already proves that product_id (each review string) is present and is a valid UUID.
  // Therefore, no additional test logic is required beyond typia.assert().
}
