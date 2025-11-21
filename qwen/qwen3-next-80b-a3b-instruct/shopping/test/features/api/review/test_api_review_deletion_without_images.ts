import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_deletion_without_images(
  connection: api.IConnection,
) {
  const review: IShoppingMallReview =
    await api.functional.shoppingMall.customer.reviews.create(connection, {
      body: {
        body: RandomGenerator.paragraph({ sentences: 5 }),
        rating: 5,
      } satisfies IShoppingMallReview.ICreate,
    });
  typia.assert(review);

  await api.functional.shoppingMall.customer.reviews.erase(connection, {
    reviewId: review.id,
  });
}
