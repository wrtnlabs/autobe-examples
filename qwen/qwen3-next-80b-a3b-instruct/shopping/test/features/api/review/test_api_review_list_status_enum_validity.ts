import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_list_status_enum_validity(
  connection: api.IConnection,
) {
  const reviews = await api.functional.shoppingMall.reviews.index(connection, {
    body: typia.random<IShoppingMallReview.IRequest>(),
  });
  typia.assert(reviews);

  // Validate that all review identifiers in the data array are valid UUIDs
  reviews.data.forEach((reviewId) => {
    TestValidator.predicate(
      "review identifier is a valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        reviewId,
      ),
    );
  });
}
