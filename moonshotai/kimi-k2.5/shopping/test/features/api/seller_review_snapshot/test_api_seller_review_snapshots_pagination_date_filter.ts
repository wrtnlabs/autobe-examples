import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_reviews_create } from "../../../generate/generate_random_ecommerce_mall_customer_reviews_create";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";

export async function test_api_seller_review_snapshots_pagination_date_filter(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create seller connection for viewing snapshots
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/seller/join",
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // Setup: Create customer connection for creating review
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/customer/join",
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // Create a review to establish snapshot base
  const review = await generate_random_ecommerce_mall_customer_reviews_create(
    customerConnection,
    {},
  );
  typia.assert(review);
  // Test 1: Basic pagination with page 1 and limit 5
  const page1Result =
    await api.functional.ecommerceMall.seller.reviews.snapshots.index(
      sellerConnection,
      {
        reviewId: review.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IEcommerceMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(page1Result);
  TestValidator.equals(
    "pagination current should be 1",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 5",
    page1Result.pagination.limit,
    5,
  );
  // Test 2: Pagination page 2
  const page2Result =
    await api.functional.ecommerceMall.seller.reviews.snapshots.index(
      sellerConnection,
      {
        reviewId: review.id,
        body: {
          page: 2,
          limit: 5,
        } satisfies IEcommerceMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals(
    "pagination current should be 2",
    page2Result.pagination.current,
    2,
  );
  // Test 3: Different limit value
  const limit3Result =
    await api.functional.ecommerceMall.seller.reviews.snapshots.index(
      sellerConnection,
      {
        reviewId: review.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies IEcommerceMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(limit3Result);
  TestValidator.equals(
    "pagination limit should be 2",
    limit3Result.pagination.limit,
    2,
  );
  // Test 4: Date range filtering from epoch to now
  const now = new Date();
  const past = new Date(0);
  const dateFilteredResult =
    await api.functional.ecommerceMall.seller.reviews.snapshots.index(
      sellerConnection,
      {
        reviewId: review.id,
        body: {
          page: 1,
          limit: 10,
          createdAtFrom: past.toISOString(),
          createdAtTo: now.toISOString(),
        } satisfies IEcommerceMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(dateFilteredResult);
  // Test 5: Combined pagination and date filtering
  const combinedResult =
    await api.functional.ecommerceMall.seller.reviews.snapshots.index(
      sellerConnection,
      {
        reviewId: review.id,
        body: {
          page: 1,
          limit: 3,
          createdAtFrom: past.toISOString(),
          createdAtTo: now.toISOString(),
        } satisfies IEcommerceMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(combinedResult);
  TestValidator.equals(
    "combined pagination limit should be 3",
    combinedResult.pagination.limit,
    3,
  );
  TestValidator.equals(
    "combined pagination current should be 1",
    combinedResult.pagination.current,
    1,
  );
  // Validate that all returned snapshots belong to the correct review
  for (const snapshot of combinedResult.data) {
    TestValidator.equals(
      "snapshot reviewId matches requested review",
      snapshot.reviewId,
      review.id,
    );
  }
}
