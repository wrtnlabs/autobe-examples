import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
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
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";

/**
 * Test review snapshot filtering capabilities by modification type.
 *
 * Validates the complete review snapshot workflow including customer authentication, review creation, multiple review edits to generate snapshots, and comprehensive filtering of the snapshot audit trail. Ensures that each review modification creates an immutable snapshot capturing before/after values for rating and deletion status, and that snapshots can be filtered by various criteria including rating changes, text content modifications, deletion status transitions, date ranges, and sorting order.
 *
 * Special attention is given to verifying that snapshots correctly capture the state transitions and that filtering parameters work as expected for audit trail queries.
 *
 * 1. Customer registers and authenticates to the platform.
 * 2. Customer creates an initial review with rating 3 and content.
 * 3. Customer edits the review to change rating from 3 to 5 (generates snapshot 1).
 * 4. Customer edits the review to change content text (generates snapshot 2).
 * 5. Customer edits the review to change rating from 5 to 4 (generates snapshot 3).
 * 6. Retrieves all snapshots and validates they were created correctly.
 * 7. Filters snapshots by rating_before = 3 and validates only snapshot 1 is returned.
 * 8. Filters snapshots by rating_after = 5 and validates only snapshot 1 is returned.
 * 9. Filters snapshots by rating_after = 4 and validates only snapshot 3 is returned.
 * 10. Filters snapshots by text content and validates correct results.
 * 11. Filters snapshots with date range and validates correct results.
 * 12. Tests ascending sort order to verify oldest snapshots appear first.
 */
export async function test_api_review_snapshot_filter_by_modification_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "123456",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create initial review using utility function (handles order item preparation)
  const review = await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {
      body: {
        rating: 3,
        content: "Initial review content for testing",
      },
    },
  );
  typia.assert(review);
  // 3. Edit review: change rating from 3 to 5 (generates snapshot 1)
  await api.functional.shoppingMall.customer.reviews.update(
    customerConnection,
    {
      reviewId: review.id,
      body: {
        rating: 5,
      } satisfies IShoppingMallReview.IUpdate,
    },
  );
  // 4. Edit review: change content text (generates snapshot 2)
  await api.functional.shoppingMall.customer.reviews.update(
    customerConnection,
    {
      reviewId: review.id,
      body: {
        content: "Updated review content after first edit",
      } satisfies IShoppingMallReview.IUpdate,
    },
  );
  // 5. Edit review: change rating from 5 to 4 (generates snapshot 3)
  await api.functional.shoppingMall.customer.reviews.update(
    customerConnection,
    {
      reviewId: review.id,
      body: {
        rating: 4,
      } satisfies IShoppingMallReview.IUpdate,
    },
  );
  // 6. Retrieve all snapshots and validate count
  const allSnapshots =
    await api.functional.shoppingMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          limit: 100,
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  TestValidator.equals("should have 3 snapshots", allSnapshots.data.length, 3);
  // 7. Filter snapshots by rating_before = 3 (should return snapshot 1 only)
  const filteredByRatingBefore3 =
    await api.functional.shoppingMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          rating_before: 3,
          limit: 100,
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(filteredByRatingBefore3);
  TestValidator.equals(
    "should have 1 snapshot with rating_before = 3",
    filteredByRatingBefore3.data.length,
    1,
  );
  TestValidator.equals(
    "snapshot should have rating_before = 3",
    filteredByRatingBefore3.data[0].rating_before,
    3,
  );
  TestValidator.equals(
    "snapshot should have rating_after = 5",
    filteredByRatingBefore3.data[0].rating_after,
    5,
  );
  // 8. Filter snapshots by rating_after = 5 (should return snapshot 1 only)
  const filteredByRatingAfter5 =
    await api.functional.shoppingMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          rating_after: 5,
          limit: 100,
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(filteredByRatingAfter5);
  TestValidator.equals(
    "should have 1 snapshot with rating_after = 5",
    filteredByRatingAfter5.data.length,
    1,
  );
  TestValidator.equals(
    "snapshot should have rating_before = 3",
    filteredByRatingAfter5.data[0].rating_before,
    3,
  );
  TestValidator.equals(
    "snapshot should have rating_after = 5",
    filteredByRatingAfter5.data[0].rating_after,
    5,
  );
  // 9. Filter snapshots by rating_after = 4 (should return snapshot 3 only)
  const filteredByRatingAfter4 =
    await api.functional.shoppingMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          rating_after: 4,
          limit: 100,
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(filteredByRatingAfter4);
  TestValidator.equals(
    "should have 1 snapshot with rating_after = 4",
    filteredByRatingAfter4.data.length,
    1,
  );
  TestValidator.equals(
    "snapshot should have rating_before = 5",
    filteredByRatingAfter4.data[0].rating_before,
    5,
  );
  TestValidator.equals(
    "snapshot should have rating_after = 4",
    filteredByRatingAfter4.data[0].rating_after,
    4,
  );
  // 10. Filter snapshots by text content (should return snapshot 2)
  const filteredByTextContent =
    await api.functional.shoppingMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          text_content_after: "Updated review content after first edit",
          limit: 100,
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(filteredByTextContent);
  TestValidator.equals(
    "should have 1 snapshot with matching text content",
    filteredByTextContent.data.length,
    1,
  );
  TestValidator.equals(
    "snapshot should have correct text content",
    filteredByTextContent.data[0].review.content,
    "Updated review content after first edit",
  );
  // 11. Filter snapshots with date range (should return all 3 snapshots)
  const oldestSnapshot = allSnapshots.data[allSnapshots.data.length - 1];
  const newestSnapshot = allSnapshots.data[0];
  const filteredByDateRange =
    await api.functional.shoppingMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          created_at_from: oldestSnapshot.created_at,
          created_at_to: newestSnapshot.created_at,
          limit: 100,
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(filteredByDateRange);
  TestValidator.equals(
    "should have 3 snapshots in date range",
    filteredByDateRange.data.length,
    3,
  );
  // 12. Test ascending sort order (oldest snapshots first)
  const sortedAscending =
    await api.functional.shoppingMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          sort_field: "created_at",
          sort_order: "asc",
          limit: 100,
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(sortedAscending);
  TestValidator.equals(
    "should have 3 snapshots in ascending order",
    sortedAscending.data.length,
    3,
  );
  TestValidator.predicate(
    "first snapshot should be oldest in ascending order",
    sortedAscending.data[0].created_at <= sortedAscending.data[1].created_at,
  );
  TestValidator.predicate(
    "second snapshot should be middle in ascending order",
    sortedAscending.data[1].created_at <= sortedAscending.data[2].created_at,
  );
  // 13. Verify default descending order (newest snapshots first)
  const sortedDescending =
    await api.functional.shoppingMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          sort_field: "created_at",
          sort_order: "desc",
          limit: 100,
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(sortedDescending);
  TestValidator.equals(
    "should have 3 snapshots in descending order",
    sortedDescending.data.length,
    3,
  );
  TestValidator.predicate(
    "first snapshot should be newest in descending order",
    sortedDescending.data[0].created_at >= sortedDescending.data[1].created_at,
  );
  TestValidator.predicate(
    "second snapshot should be middle in descending order",
    sortedDescending.data[1].created_at >= sortedDescending.data[2].created_at,
  );
}
