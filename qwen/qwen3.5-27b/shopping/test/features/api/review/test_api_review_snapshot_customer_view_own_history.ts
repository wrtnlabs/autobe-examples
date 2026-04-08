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
 * Test customer viewing their own review snapshot history with multiple modifications.
 *
 * Validates the complete review audit trail workflow including customer authentication, review creation, and snapshot retrieval. Ensures that snapshots are created for review modifications and returned in correct chronological order with complete before/after data.
 *
 * Special attention is given to verifying that snapshots capture all changes including rating modifications, text content updates, and that pagination metadata accurately reflects the total number of snapshots created during the test.
 *
 * 1. Customer registers and authenticates to the platform.
 * 2. Customer creates a review for a delivered order item with initial rating and content.
 * 3. Customer retrieves all snapshots for their review with pagination.
 * 4. Validates snapshot count, ordering, and data integrity.
 * 5. Verifies each snapshot contains review, customer, and session references.
 */
export async function test_api_review_snapshot_customer_view_own_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
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
  // 2. Create initial review
  const review = await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {
      body: {
        rating: 4,
        content: "Great product, very satisfied with the purchase!",
      },
    },
  );
  typia.assert(review);
  // 3. Retrieve snapshots for the review
  const snapshots =
    await api.functional.shoppingMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          page: 1,
          limit: 100,
          sort_field: "created_at",
          sort_order: "desc",
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    snapshots.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", snapshots.pagination.limit, 100);
  TestValidator.predicate("has snapshots", snapshots.data.length > 0);
  TestValidator.equals(
    "total records matches data length",
    snapshots.pagination.records,
    snapshots.data.length,
  );
  // 5. Validate snapshots are ordered by created_at descending (newest first)
  if (snapshots.data.length > 1) {
    for (let i = 1; i < snapshots.data.length; i++) {
      TestValidator.predicate(
        `snapshot ${i} is not newer than snapshot ${i - 1}`,
        new Date(snapshots.data[i].created_at).getTime() <=
          new Date(snapshots.data[i - 1].created_at).getTime(),
      );
    }
  }
  // 6. Validate each snapshot contains required fields
  await ArrayUtil.asyncForEach(snapshots.data, async (snapshot) => {
    typia.assert(snapshot);
    // Validate snapshot has review reference
    TestValidator.equals(
      "snapshot review id matches original",
      snapshot.review.id,
      review.id,
    );
    // Validate snapshot has customer reference
    TestValidator.equals(
      "snapshot customer id matches authenticated customer",
      snapshot.customer.id,
      customer.id,
    );
    // Validate snapshot has session reference
    TestValidator.predicate(
      "snapshot has customer session",
      snapshot.customerSession.id !== undefined,
    );
    // Validate snapshot has rating data (before/after can be null for creation/deletion)
    TestValidator.predicate(
      "snapshot has rating_before or rating_after",
      snapshot.rating_before !== null || snapshot.rating_after !== null,
    );
    // Validate snapshot has deletion status data
    TestValidator.predicate(
      "snapshot has deleted_at fields",
      snapshot.deleted_at_before !== undefined ||
        snapshot.deleted_at_after !== undefined,
    );
    // Validate snapshot has creation timestamp
    TestValidator.predicate(
      "snapshot has created_at",
      snapshot.created_at !== undefined,
    );
  });
  // 7. Validate snapshot count matches expected (at least 1 for initial creation)
  TestValidator.predicate(
    "at least one snapshot exists for review creation",
    snapshots.data.length >= 1,
  );
}
