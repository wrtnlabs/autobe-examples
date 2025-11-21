import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_customer_id_uuid_validity(
  connection: api.IConnection,
) {
  const response: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: typia.random<IShoppingMallReview.IRequest>(),
    });
  typia.assert(response);
  TestValidator.predicate("response data exists", response.data.length >= 0);
  if (response.data.length > 0) {
    for (const review of response.data) {
      // IShoppingMallReview.ISummary is defined as string in the provided DTOs
      // Each item in the data array is a string representing the UUID of the customer_id
      TestValidator.predicate(
        "customer_id is valid UUID format",
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          review,
        ),
      );
    }
  }
}
