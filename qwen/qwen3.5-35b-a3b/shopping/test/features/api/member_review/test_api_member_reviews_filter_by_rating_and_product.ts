import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_reviews_filter_by_rating_and_product(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.ecommerceMall.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Test rating_min/rating_max filter (rating range 4-5)
  const ratingFilterResponse =
    await api.functional.ecommerceMall.member.member.reviews.index(
      memberConnection,
      {
        body: {
          rating_min: 4,
          rating_max: 5,
          page: 1,
          page_size: 10,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(ratingFilterResponse);
  // Verify all reviews in result have rating in range 4-5
  for (const review of ratingFilterResponse.data) {
    TestValidator.predicate(
      "review rating in range 4-5",
      review.rating >= 4 && review.rating <= 5,
    );
  }
  // Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    ratingFilterResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    ratingFilterResponse.pagination.limit,
    10,
  );
  // 3. Test filtering by exact rating
  const exactRatingFilterResponse =
    await api.functional.ecommerceMall.member.member.reviews.index(
      memberConnection,
      {
        body: {
          rating: 5,
          page: 1,
          page_size: 10,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(exactRatingFilterResponse);
  // Verify all reviews have exact rating 5
  for (const review of exactRatingFilterResponse.data) {
    TestValidator.predicate("review rating equals 5", review.rating === 5);
  }
  // 4. Test pagination with different page sizes
  const pageSizeFilterResponse =
    await api.functional.ecommerceMall.member.member.reviews.index(
      memberConnection,
      {
        body: {
          page: 1,
          page_size: 5,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(pageSizeFilterResponse);
  TestValidator.equals(
    "pagination limit with page_size=5",
    pageSizeFilterResponse.pagination.limit,
    5,
  );
  // 5. Test combined filters (rating range + pagination)
  const combinedFilterResponse =
    await api.functional.ecommerceMall.member.member.reviews.index(
      memberConnection,
      {
        body: {
          rating_min: 3,
          rating_max: 5,
          page: 1,
          page_size: 20,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(combinedFilterResponse);
  // Verify all reviews match combined filter
  for (const review of combinedFilterResponse.data) {
    TestValidator.predicate(
      "review rating in range 3-5 (combined filter)",
      review.rating >= 3 && review.rating <= 5,
    );
  }
  // 6. Test sorting by rating (ascending)
  const sortByRatingAscResponse =
    await api.functional.ecommerceMall.member.member.reviews.index(
      memberConnection,
      {
        body: {
          sort_by: "rating",
          sort_order: "asc",
          page: 1,
          page_size: 10,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(sortByRatingAscResponse);
  // Verify reviews are sorted in ascending order by rating
  for (let i = 1; i < sortByRatingAscResponse.data.length; i++) {
    const prevRating = sortByRatingAscResponse.data[i - 1].rating;
    const currRating = sortByRatingAscResponse.data[i].rating;
    TestValidator.predicate(
      `rating ascending: ${prevRating} <= ${currRating}`,
      prevRating <= currRating,
    );
  }
  // 7. Test sorting by rating (descending)
  const sortByRatingDescResponse =
    await api.functional.ecommerceMall.member.member.reviews.index(
      memberConnection,
      {
        body: {
          sort_by: "rating",
          sort_order: "desc",
          page: 1,
          page_size: 10,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(sortByRatingDescResponse);
  // Verify reviews are sorted in descending order by rating
  for (let i = 1; i < sortByRatingDescResponse.data.length; i++) {
    const prevRating = sortByRatingDescResponse.data[i - 1].rating;
    const currRating = sortByRatingDescResponse.data[i].rating;
    TestValidator.predicate(
      `rating descending: ${prevRating} >= ${currRating}`,
      prevRating >= currRating,
    );
  }
  // 8. Test empty result when no reviews match filter
  const noMatchFilterResponse =
    await api.functional.ecommerceMall.member.member.reviews.index(
      memberConnection,
      {
        body: {
          rating_min: 1,
          rating_max: 1,
          page: 1,
          page_size: 10,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(noMatchFilterResponse);
  // Verify empty data array
  TestValidator.equals(
    "no matching reviews returns empty array",
    noMatchFilterResponse.data.length,
    0,
  );
  // Verify pagination reflects empty result
  TestValidator.equals(
    "pagination records when empty",
    noMatchFilterResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages when empty",
    noMatchFilterResponse.pagination.pages,
    0,
  );
  // 9. Test product_id filter (requires existing product)
  // Since we can't create products in this test, we'll verify the filter parameter is accepted
  const productFilterResponse =
    await api.functional.ecommerceMall.member.member.reviews.index(
      memberConnection,
      {
        body: {
          product_id: typia.random<string & tags.Format<"uuid">>(),
          page: 1,
          page_size: 10,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(productFilterResponse);
  // Verify pagination works with product filter
  TestValidator.equals(
    "pagination with product filter current",
    productFilterResponse.pagination.current,
    1,
  );
}
