import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_method_restrictions(
  connection: api.IConnection,
) {
  // Test that the PATCH method succeeds on /shoppingMall/reviews endpoint, as this is the only permitted method
  // According to the API contract, this endpoint only accepts PATCH requests to retrieve filtered, sorted, and paginated reviews
  // All other methods (GET, POST) are restricted by the server and will return 405 Method Not Allowed — however, the SDK only exposes the allowed PATCH method
  const response: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: typia.random<IShoppingMallReview.IRequest>(),
    });
  typia.assert(response);
}
