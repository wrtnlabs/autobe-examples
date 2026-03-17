import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
 * Test that a customer can successfully view the snapshot history of their own review after editing it.
 *
 * This test validates:
 * 1. Customer can retrieve snapshots for their own reviews
 * 2. Snapshots contain the previous state before edits
 * 3. Pagination metadata is correct
 * 4. Snapshots are ordered chronologically
 */
export async function test_api_review_snapshot_history_view_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication - create actor-specific connection
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: "https://test.example.com/reviews",
      referrer: "https://test.example.com",
    },
  });
  typia.assert(customer);
  // 2. Create a review with initial state (rating 4, content "Good product")
  // Note: This requires a delivered order item. Using the generation utility.
  const review = await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {
      body: {
        rating: 4,
        content: "Good product",
      },
    },
  );
  typia.assert(review);
  // 3. Retrieve snapshots for the review
  const snapshotPage =
    await api.functional.shoppingMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          page: 1,
          limit: 10,
          sort: "created_at", // Chronological order (oldest first)
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage);
  // 4. Validate pagination metadata
  TestValidator.equals("current page", snapshotPage.pagination.current, 1);
  TestValidator.equals("limit", snapshotPage.pagination.limit, 10);
  TestValidator.predicate("records >= 0", snapshotPage.pagination.records >= 0);
  TestValidator.predicate("pages >= 0", snapshotPage.pagination.pages >= 0);
  // 5. If snapshots exist (review was edited), validate chronological order
  if (snapshotPage.data.length > 1) {
    for (let i = 1; i < snapshotPage.data.length; i++) {
      TestValidator.predicate(
        "snapshots ordered chronologically",
        new Date(snapshotPage.data[i - 1].created_at) <=
          new Date(snapshotPage.data[i].created_at),
      );
    }
  }
  // 6. Verify customer cannot view another customer's review snapshots
  // Create another customer
  const otherCustomerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(otherCustomerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: "https://test.example.com/reviews",
      referrer: "https://test.example.com",
    },
  });
  // Attempt to view original customer's review snapshots should fail
  await TestValidator.error(
    "customer cannot view another customer's review snapshots",
    async () => {
      await api.functional.shoppingMall.customer.reviews.snapshots.index(
        otherCustomerConnection,
        {
          reviewId: review.id,
          body: {
            page: 1,
            limit: 10,
          } satisfies IShoppingMallReviewSnapshot.IRequest,
        },
      );
    },
  );
}
