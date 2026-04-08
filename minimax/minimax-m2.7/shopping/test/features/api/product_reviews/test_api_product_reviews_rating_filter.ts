import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
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

export async function test_api_product_reviews_rating_filter(
  connection: api.IConnection,
): Promise<void> {
  // Generate test product ID
  const productId = typia.random<string & tags.Format<"uuid">>();
  // Test filtering by each rating value (1-5 stars)
  const ratingValues = [1, 2, 3, 4, 5] as const;
  for (const rating of ratingValues) {
    // Request reviews filtered by specific rating
    const response = await api.functional.ecommerceMall.products.reviews.index(
      connection,
      {
        productId,
        body: {
          rating: rating as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<5>,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
    typia.assert(response);
    // Validate pagination structure
    TestValidator.equals(
      "pagination exists",
      response.pagination !== null,
      true,
    );
    TestValidator.predicate(
      "pagination records is non-negative",
      response.pagination.records >= 0,
    );
    // Validate all returned reviews have the exact specified rating
    for (const review of response.data) {
      TestValidator.equals(
        `review has rating ${rating}`,
        review.rating,
        rating,
      );
    }
    // Validate that pagination records matches actual data length when limit allows full page
    if (response.pagination.limit >= response.data.length) {
      TestValidator.equals(
        `records count matches data length for rating ${rating}`,
        response.pagination.records,
        response.data.length,
      );
    }
  }
  // Test that filtering excludes reviews with different ratings
  // Create a baseline count without filter
  const allReviewsResponse =
    await api.functional.ecommerceMall.products.reviews.index(connection, {
      productId,
      body: {} satisfies IEcommerceMallReview.IRequest,
    });
  typia.assert(allReviewsResponse);
  // Get 5-star reviews count
  const fiveStarResponse =
    await api.functional.ecommerceMall.products.reviews.index(connection, {
      productId,
      body: {
        rating: 5 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<5>,
      } satisfies IEcommerceMallReview.IRequest,
    });
  typia.assert(fiveStarResponse);
  // 5-star reviews should be <= total reviews
  TestValidator.predicate(
    "5-star filtered count <= total count",
    fiveStarResponse.pagination.records <=
      allReviewsResponse.pagination.records,
  );
}
