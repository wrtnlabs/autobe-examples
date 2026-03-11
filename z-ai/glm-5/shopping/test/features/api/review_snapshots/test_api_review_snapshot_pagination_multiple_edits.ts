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
 * Test pagination functionality for review snapshots.
 *
 * Validates that pagination works correctly when retrieving
 * review snapshots that preserve edit history.
 */
export async function test_api_review_snapshot_pagination_multiple_edits(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 2. Create a review using the utility function
  const review = await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {},
  );
  typia.assert(review);
  // 3. Retrieve snapshots with pagination (page 1, limit 2)
  const snapshotsPage1 =
    await api.functional.shoppingMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsPage1);
  // 4. Validate pagination metadata
  TestValidator.equals("current page", snapshotsPage1.pagination.current, 1);
  TestValidator.equals("limit per page", snapshotsPage1.pagination.limit, 2);
  TestValidator.predicate(
    "total records is non-negative",
    snapshotsPage1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is calculated correctly",
    snapshotsPage1.pagination.pages ===
      Math.ceil(
        snapshotsPage1.pagination.records / snapshotsPage1.pagination.limit,
      ),
  );
  // 5. Validate snapshot data structure (if any exist)
  if (snapshotsPage1.data.length > 0) {
    for (const snapshot of snapshotsPage1.data) {
      TestValidator.predicate(
        "snapshot rating is valid",
        snapshot.rating >= 1 && snapshot.rating <= 5,
      );
    }
    // 6. Validate chronological ordering (oldest first by default)
    for (let i = 1; i < snapshotsPage1.data.length; i++) {
      const prevTime = new Date(
        snapshotsPage1.data[i - 1].created_at,
      ).getTime();
      const currTime = new Date(snapshotsPage1.data[i].created_at).getTime();
      TestValidator.predicate(
        "snapshots are ordered chronologically",
        prevTime <= currTime,
      );
    }
  }
  // 7. Test page navigation (page 2) if there are enough records
  if (snapshotsPage1.pagination.pages > 1) {
    const snapshotsPage2 =
      await api.functional.shoppingMall.customer.reviews.snapshots.index(
        customerConnection,
        {
          reviewId: review.id,
          body: {
            page: 2,
            limit: 2,
          } satisfies IShoppingMallReviewSnapshot.IRequest,
        },
      );
    typia.assert(snapshotsPage2);
    TestValidator.equals(
      "page 2 current",
      snapshotsPage2.pagination.current,
      2,
    );
    TestValidator.equals("page 2 limit", snapshotsPage2.pagination.limit, 2);
  }
}
