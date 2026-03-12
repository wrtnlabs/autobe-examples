import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test filtering seller's product reviews by specific star rating.
 *
 * This test verifies that the rating filter parameter correctly filters
 * reviews to show only those with the exact star rating specified.
 * Tests filtering with multiple rating values (1, 3, 5) to ensure
 * the filter works correctly across different rating levels.
 */
export async function test_api_seller_reviews_my_products_filter_by_rating(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 2. Test filtering by rating = 5
  const filterRating5: IShoppingMallReview.IRequest = {
    rating: 5,
    page: 1,
    limit: 20,
  } satisfies IShoppingMallReview.IRequest;
  const reviewsRating5 =
    await api.functional.shoppingMall.seller.reviews.my_products.index(
      sellerConnection,
      { body: filterRating5 },
    );
  typia.assert(reviewsRating5);
  // Verify all reviews have rating exactly equal to 5
  for (const review of reviewsRating5.data) {
    TestValidator.equals(
      `review rating equals filter value (5)`,
      review.rating,
      5,
    );
  }
  // 3. Test filtering by rating = 3
  const filterRating3: IShoppingMallReview.IRequest = {
    rating: 3,
    page: 1,
    limit: 20,
  } satisfies IShoppingMallReview.IRequest;
  const reviewsRating3 =
    await api.functional.shoppingMall.seller.reviews.my_products.index(
      sellerConnection,
      { body: filterRating3 },
    );
  typia.assert(reviewsRating3);
  // Verify all reviews have rating exactly equal to 3
  for (const review of reviewsRating3.data) {
    TestValidator.equals(
      `review rating equals filter value (3)`,
      review.rating,
      3,
    );
  }
  // 4. Test filtering by rating = 1
  const filterRating1: IShoppingMallReview.IRequest = {
    rating: 1,
    page: 1,
    limit: 20,
  } satisfies IShoppingMallReview.IRequest;
  const reviewsRating1 =
    await api.functional.shoppingMall.seller.reviews.my_products.index(
      sellerConnection,
      { body: filterRating1 },
    );
  typia.assert(reviewsRating1);
  // Verify all reviews have rating exactly equal to 1
  for (const review of reviewsRating1.data) {
    TestValidator.equals(
      `review rating equals filter value (1)`,
      review.rating,
      1,
    );
  }
  // 5. Verify pagination metadata is correct for filtered results
  TestValidator.predicate(
    "pagination records match data length for rating=5",
    reviewsRating5.pagination.records === reviewsRating5.data.length,
  );
  TestValidator.predicate(
    "pagination records match data length for rating=3",
    reviewsRating3.pagination.records === reviewsRating3.data.length,
  );
  TestValidator.predicate(
    "pagination records match data length for rating=1",
    reviewsRating1.pagination.records === reviewsRating1.data.length,
  );
  // 6. Verify pagination limit is respected
  TestValidator.predicate(
    "data length does not exceed limit for rating=5",
    reviewsRating5.data.length <= 20,
  );
  TestValidator.predicate(
    "data length does not exceed limit for rating=3",
    reviewsRating3.data.length <= 20,
  );
  TestValidator.predicate(
    "data length does not exceed limit for rating=1",
    reviewsRating1.data.length <= 20,
  );
}
