import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_review_rating_filter_range(
  connection: api.IConnection,
): Promise<void> {
  // Test filtering reviews by high rating range (4-5 stars) with descending sort
  const highRatingReviews = await api.functional.ecommerceMall.reviews.index(
    connection,
    {
      body: {
        minRating: 4 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<5>,
        maxRating: 5 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<5>,
        sortBy: "rating",
        sortOrder: "desc",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallReview.IRequest,
    },
  );
  typia.assert(highRatingReviews);
  // Validate all returned reviews have ratings within 4-5 range
  for (const review of highRatingReviews.data) {
    TestValidator.predicate(
      `review ${review.id} rating should be between 4 and 5`,
      review.rating >= 4 && review.rating <= 5,
    );
  }
  // Validate descending order (highest rating first)
  for (let i = 1; i < highRatingReviews.data.length; i++) {
    TestValidator.predicate(
      `rating sort descending: review ${i} rating should be <= review ${i - 1} rating`,
      highRatingReviews.data[i].rating <= highRatingReviews.data[i - 1].rating,
    );
  }
  // Test filtering reviews by low rating range (1-2 stars)
  const lowRatingReviews = await api.functional.ecommerceMall.reviews.index(
    connection,
    {
      body: {
        minRating: 1 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<5>,
        maxRating: 2 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<5>,
        sortBy: "rating",
        sortOrder: "desc",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallReview.IRequest,
    },
  );
  typia.assert(lowRatingReviews);
  // Validate all returned reviews have ratings within 1-2 range
  for (const review of lowRatingReviews.data) {
    TestValidator.predicate(
      `review ${review.id} rating should be between 1 and 2`,
      review.rating >= 1 && review.rating <= 2,
    );
  }
  // Test ascending sort order for rating
  const ascendingReviews = await api.functional.ecommerceMall.reviews.index(
    connection,
    {
      body: {
        minRating: 1 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<5>,
        maxRating: 5 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<5>,
        sortBy: "rating",
        sortOrder: "asc",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallReview.IRequest,
    },
  );
  typia.assert(ascendingReviews);
  // Validate ascending order (lowest rating first)
  for (let i = 1; i < ascendingReviews.data.length; i++) {
    TestValidator.predicate(
      `rating sort ascending: review ${i} rating should be >= review ${i - 1} rating`,
      ascendingReviews.data[i].rating >= ascendingReviews.data[i - 1].rating,
    );
  }
}
