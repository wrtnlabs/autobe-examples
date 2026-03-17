import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_orders_create";
import { generate_random_ecommerce_mall_customer_reviews_create } from "../../../generate/generate_random_ecommerce_mall_customer_reviews_create";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";

/**
 * Test filtering customer reviews by rating value and creation date range.
 *
 * This test validates the customer review filtering functionality by:
 * 1. Creating a customer account and authenticating
 * 2. Creating multiple orders with delivered items
 * 3. Creating reviews with varying ratings (1-5 stars) and different dates
 * 4. Testing filter by rating only
 * 5. Testing filter by date range only
 * 6. Testing combined filter (rating AND date range)
 * 7. Validating pagination works correctly with filters
 */
export async function test_api_customer_reviews_filter_by_rating_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create multiple orders with delivered items
  const orders: IEcommerceMallOrder[] = [];
  await ArrayUtil.asyncRepeat(5, async () => {
    const order = await generate_random_ecommerce_mall_customer_orders_create(
      customerConnection,
      {},
    );
    typia.assert(order);
    orders.push(order);
  });
  // 3. Create reviews with varying ratings and different dates
  const reviews: IEcommerceMallReview[] = [];
  const orderItems = orders.flatMap((order) => order.order_items);
  // Create reviews with different ratings (1-5)
  await ArrayUtil.asyncRepeat(5, async (index) => {
    const rating = (index + 1) as 1 | 2 | 3 | 4 | 5;
    const orderItem = orderItems[index % orderItems.length];
    const review = await generate_random_ecommerce_mall_customer_reviews_create(
      customerConnection,
      {
        body: {
          order_item_id: orderItem.id,
          product_id: orderItem.productVariant.id,
          rating: rating,
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallReview.ICreate,
      },
    );
    typia.assert(review);
    reviews.push(review);
  });
  // 4. Test filter by rating only (e.g., 5-star reviews)
  const fiveStarFilter: IEcommerceMallReview.IRequest = {
    rating: 5,
    page: 1,
    pageSize: 20,
  };
  const fiveStarResult =
    await api.functional.ecommerceMall.customer.reviews.my.index(
      customerConnection,
      { body: fiveStarFilter },
    );
  typia.assert(fiveStarResult);
  // Validate all returned reviews have rating 5
  fiveStarResult.data.forEach((review) => {
    TestValidator.equals("rating is 5", review.rating, 5);
  });
  // 5. Test filter by date range only
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRangeFilter: IEcommerceMallReview.IRequest = {
    startDate: thirtyDaysAgo.toISOString(),
    endDate: now.toISOString(),
    page: 1,
    pageSize: 20,
  };
  const dateRangeResult =
    await api.functional.ecommerceMall.customer.reviews.my.index(
      customerConnection,
      { body: dateRangeFilter },
    );
  typia.assert(dateRangeResult);
  // Validate all returned reviews are within date range
  await ArrayUtil.asyncForEach(dateRangeResult.data, async (review) => {
    const reviewDate = new Date(review.createdAt);
    TestValidator.predicate(
      "review within start date",
      reviewDate >= thirtyDaysAgo,
    );
    TestValidator.predicate("review within end date", reviewDate <= now);
  });
  // 6. Test combined filter (rating AND date range)
  const combinedFilter: IEcommerceMallReview.IRequest = {
    rating: 5,
    startDate: thirtyDaysAgo.toISOString(),
    endDate: now.toISOString(),
    page: 1,
    pageSize: 20,
  };
  const combinedResult =
    await api.functional.ecommerceMall.customer.reviews.my.index(
      customerConnection,
      { body: combinedFilter },
    );
  typia.assert(combinedResult);
  // Validate all returned reviews match BOTH criteria
  combinedResult.data.forEach((review) => {
    TestValidator.equals("rating is 5", review.rating, 5);
    const reviewDate = new Date(review.createdAt);
    TestValidator.predicate(
      "review within start date",
      reviewDate >= thirtyDaysAgo,
    );
    TestValidator.predicate("review within end date", reviewDate <= now);
  });
  // 7. Test pagination with filters
  const paginationFilter: IEcommerceMallReview.IRequest = {
    rating: 3,
    page: 1,
    pageSize: 1,
  };
  const paginationResult =
    await api.functional.ecommerceMall.customer.reviews.my.index(
      customerConnection,
      { body: paginationFilter },
    );
  typia.assert(paginationResult);
  // Validate pagination metadata
  TestValidator.equals("page is 1", paginationResult.pagination.current, 1);
  TestValidator.equals("limit is 1", paginationResult.pagination.limit, 1);
  TestValidator.predicate("has data", paginationResult.data.length > 0);
  TestValidator.predicate(
    "data matches filter",
    paginationResult.data.every((review) => review.rating === 3),
  );
  // 8. Test filter with no matching results
  const noMatchFilter: IEcommerceMallReview.IRequest = {
    rating: 5,
    startDate: "2020-01-01T00:00:00.000Z",
    endDate: "2020-01-02T00:00:00.000Z",
    page: 1,
    pageSize: 20,
  };
  const noMatchResult =
    await api.functional.ecommerceMall.customer.reviews.my.index(
      customerConnection,
      { body: noMatchFilter },
    );
  typia.assert(noMatchResult);
  // Validate empty result
  TestValidator.equals("no matching reviews", noMatchResult.data.length, 0);
  TestValidator.predicate(
    "pagination records is 0",
    noMatchResult.pagination.records === 0,
  );
}
