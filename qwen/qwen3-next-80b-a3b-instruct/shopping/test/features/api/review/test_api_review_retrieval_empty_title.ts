import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_retrieval_empty_title(
  connection: api.IConnection,
) {
  // 1. Create a review with empty title but full body content
  const reviewBody: string = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 10,
  });
  const reviewScore: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5> = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();

  const createdReview: IShoppingMallReview =
    await api.functional.shoppingMall.customer.reviews.create(connection, {
      body: {
        title: undefined, // Explicitly empty title per requirements
        body: reviewBody satisfies string & tags.MinLength<10>,
        rating: reviewScore,
      } satisfies IShoppingMallReview.ICreate,
    });
  typia.assert(createdReview);

  // 2. Retrieve the review to verify empty title handling
  const retrievedReview: IShoppingMallReview =
    await api.functional.shoppingMall.reviews.at(connection, {
      reviewId: createdReview.id,
    });
  typia.assert(retrievedReview);

  // 3. Validate that the review was retrieved with empty title but intact body and rating
  TestValidator.equals(
    "review title should be empty",
    retrievedReview.title,
    "",
  );
  TestValidator.equals(
    "review body should match",
    retrievedReview.body,
    reviewBody,
  );
  TestValidator.equals(
    "review rating should match",
    retrievedReview.rating,
    reviewScore,
  );
  TestValidator.predicate(
    "review status should be pending",
    retrievedReview.status === "pending",
  );
}
