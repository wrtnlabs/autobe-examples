import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_creation_by_customer(
  connection: api.IConnection,
) {
  const review: IShoppingMallReview =
    await api.functional.shoppingMall.customer.reviews.create(connection, {
      body: {
        body: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 4,
          wordMax: 8,
        }),
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 2,
          wordMax: 8,
        }),
      } satisfies IShoppingMallReview.ICreate,
    });
  typia.assert(review);

  TestValidator.equals(
    "review status should be pending",
    review.status,
    "pending",
  );
  TestValidator.predicate(
    "review ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      review.id,
    ),
  );
}
