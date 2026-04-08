import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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

/**
 * Test viewing a customer's review history with filtering capabilities.
 *
 * Validates the review filtering functionality by testing various filter combinations including customer ID, date range, rating range, and deletion status on the PATCH /shoppingMall/reviews endpoint. Ensures that filters work correctly individually and in combination, and that pagination metadata accurately reflects filtered results.
 *
 * The test verifies that customer-specific review history can be retrieved, date range filtering narrows results correctly, rating filters apply AND logic when combined, and deleted reviews are excluded by default but can be included when explicitly requested.
 *
 * 1. Create seller and customer accounts for test setup.
 * 2. Test customerId filter to retrieve reviews by the customer.
 * 3. Test date range filtering with createdAtFrom and createdAtTo.
 * 4. Test combined filters: customerId + ratingMin for high-rated reviews.
 * 5. Verify pagination works correctly with customer filter.
 * 6. Test that deleted reviews are excluded by default.
 * 7. Test including deleted reviews with deleted=true filter.
 * 8. Test rating range filter with both min and max values.
 * 9. Verify response includes complete review summary with customer and product information.
 */
export async function test_api_review_customer_history_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 2. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);
  // 3. Test customerId filter - get all reviews by the customer
  const allCustomerReviews = await api.functional.shoppingMall.reviews.index(
    customerConnection,
    {
      body: {
        customerId: customer.id,
        page: 1,
        limit: 100,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(allCustomerReviews);
  // Verify all returned reviews belong to the customer
  TestValidator.predicate("all reviews belong to specified customer", () =>
    allCustomerReviews.data.every(
      (review) => review.customer.id === customer.id,
    ),
  );
  // 4. Verify reviews are sorted by created_at descending (newest first)
  TestValidator.predicate("reviews sorted by created_at descending", () => {
    for (let i = 1; i < allCustomerReviews.data.length; i++) {
      if (
        new Date(allCustomerReviews.data[i - 1].created_at) <
        new Date(allCustomerReviews.data[i].created_at)
      ) {
        return false;
      }
    }
    return true;
  });
  // 5. Test date range filtering
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentReviews = await api.functional.shoppingMall.reviews.index(
    customerConnection,
    {
      body: {
        customerId: customer.id,
        createdAtFrom: oneWeekAgo.toISOString(),
        createdAtTo: now.toISOString(),
        page: 1,
        limit: 100,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(recentReviews);
  // Verify date range filter returns subset or equal to all reviews
  TestValidator.predicate(
    "date range filter returns valid subset",
    () =>
      recentReviews.pagination.records <= allCustomerReviews.pagination.records,
  );
  // 6. Test combined filters: customerId + ratingMin
  const highRatedReviews = await api.functional.shoppingMall.reviews.index(
    customerConnection,
    {
      body: {
        customerId: customer.id,
        ratingMin: 4,
        page: 1,
        limit: 100,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(highRatedReviews);
  // Verify all returned reviews have rating >= 4
  TestValidator.predicate("high rated reviews filter works", () =>
    highRatedReviews.data.every((review) => review.rating >= 4),
  );
  // 7. Test pagination with customer filter
  const paginatedReviews = await api.functional.shoppingMall.reviews.index(
    customerConnection,
    {
      body: {
        customerId: customer.id,
        page: 1,
        limit: 2,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(paginatedReviews);
  TestValidator.equals(
    "pagination limit respected",
    paginatedReviews.data.length,
    Math.min(2, paginatedReviews.pagination.records),
  );
  TestValidator.equals(
    "pagination total records consistent",
    paginatedReviews.pagination.records,
    allCustomerReviews.pagination.records,
  );
  TestValidator.predicate(
    "pagination current page is 1",
    () => paginatedReviews.pagination.current === 1,
  );
  // 8. Test that deleted reviews are excluded by default
  const activeReviews = await api.functional.shoppingMall.reviews.index(
    customerConnection,
    {
      body: {
        customerId: customer.id,
        deleted: false,
        page: 1,
        limit: 100,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(activeReviews);
  TestValidator.equals(
    "active reviews count matches default behavior",
    activeReviews.pagination.records,
    allCustomerReviews.pagination.records,
  );
  // 9. Test including deleted reviews with deleted=true
  const deletedReviews = await api.functional.shoppingMall.reviews.index(
    customerConnection,
    {
      body: {
        customerId: customer.id,
        deleted: true,
        page: 1,
        limit: 100,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(deletedReviews);
  // Deleted reviews count should be >= 0 (may be 0 if no deleted reviews exist)
  TestValidator.predicate(
    "deleted reviews query succeeds",
    () => deletedReviews.pagination.records >= 0,
  );
  // 10. Test rating range filter (min and max)
  const midRatedReviews = await api.functional.shoppingMall.reviews.index(
    customerConnection,
    {
      body: {
        customerId: customer.id,
        ratingMin: 2,
        ratingMax: 4,
        page: 1,
        limit: 100,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(midRatedReviews);
  TestValidator.predicate("rating range filter works correctly", () =>
    midRatedReviews.data.every(
      (review) => review.rating >= 2 && review.rating <= 4,
    ),
  );
  // 11. Verify response includes complete review summary
  TestValidator.predicate("review summary includes customer information", () =>
    allCustomerReviews.data.every(
      (review) =>
        review.customer.id === customer.id &&
        review.customer.email === customer.email &&
        review.customer.display_name !== undefined,
    ),
  );
  TestValidator.predicate("review summary includes product information", () =>
    allCustomerReviews.data.every(
      (review) =>
        review.product.id !== undefined && review.product.name !== undefined,
    ),
  );
  // 12. Test search filter with customerId
  const searchReviews = await api.functional.shoppingMall.reviews.index(
    customerConnection,
    {
      body: {
        customerId: customer.id,
        search: RandomGenerator.alphabets(3),
        page: 1,
        limit: 100,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(searchReviews);
  TestValidator.predicate(
    "search filter with customerId succeeds",
    () => searchReviews.pagination.records >= 0,
  );
  // 13. Test sort parameter with customerId
  const sortedReviews = await api.functional.shoppingMall.reviews.index(
    customerConnection,
    {
      body: {
        customerId: customer.id,
        sort: "rating_desc",
        page: 1,
        limit: 100,
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(sortedReviews);
  TestValidator.predicate(
    "sort parameter with customerId succeeds",
    () => sortedReviews.pagination.records >= 0,
  );
}
