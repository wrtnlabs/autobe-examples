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
 * Test the snapshot preservation when a review is deleted.
 *
 * Validates the complete review deletion workflow including customer registration, review creation, review deletion, and snapshot verification. Ensures that deleting a review creates an immutable snapshot capturing the transition from active to deleted state, with proper before/after values for the deletion timestamp.
 *
 * Special attention is given to verifying that the deletion snapshot correctly records deleted_at_before as null (review was active) and deleted_at_after as a non-null timestamp (review is now deleted). This immutable audit trail is critical for dispute resolution and platform accountability.
 *
 * 1. Customer registers with email and password credentials.
 * 2. Customer creates a review with rating and content.
 * 3. Customer retrieves snapshots before deletion to verify initial state.
 * 4. Customer deletes the review to create deletion snapshot.
 * 5. Customer retrieves snapshots after deletion to verify deletion snapshot exists.
 * 6. Validates that the deletion snapshot shows deleted_at_before as null and deleted_at_after as non-null.
 * 7. Validates that filtering by deleted_at_after=true returns only the deletion snapshot.
 */
export async function test_api_review_snapshot_preserved_after_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(customer);
  // 2. Create a review
  const review = await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {
      body: {},
    },
  );
  typia.assert(review);
  // 3. Retrieve snapshots before deletion (should be empty or have initial snapshot)
  const snapshotsBefore =
    await api.functional.shoppingMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId: review.id,
        body: {},
      },
    );
  typia.assert(snapshotsBefore);
  // 4. Delete the review to create deletion snapshot
  await api.functional.shoppingMall.customer.reviews.erase(customerConnection, {
    reviewId: review.id,
  });
  // 5. Retrieve snapshots after deletion
  const snapshotsAfter =
    await api.functional.shoppingMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId: review.id,
        body: {},
      },
    );
  typia.assert(snapshotsAfter);
  // 6. Validate that at least one snapshot exists after deletion
  TestValidator.predicate(
    "snapshots exist after deletion",
    snapshotsAfter.data.length > 0,
  );
  // 7. Find the deletion snapshot (where deleted_at_after is not null)
  const deletionSnapshot = snapshotsAfter.data.find(
    (snapshot) => snapshot.deleted_at_after !== null,
  );
  // 8. Validate that deletion snapshot exists
  TestValidator.predicate(
    "deletion snapshot exists",
    deletionSnapshot !== undefined,
  );
  // 9. Validate deletion snapshot properties if it exists
  if (deletionSnapshot !== undefined) {
    typia.assert(deletionSnapshot);
    // 10. Validate that deleted_at_before is null (review was active before deletion)
    TestValidator.equals(
      "deleted_at_before is null (review was active)",
      deletionSnapshot.deleted_at_before,
      null,
    );
    // 11. Validate that deleted_at_after is non-null (review is now deleted)
    TestValidator.predicate(
      "deleted_at_after is non-null (review is deleted)",
      deletionSnapshot.deleted_at_after !== null,
    );
  }
  // 12. Filter snapshots by deleted_at_after=true to verify only deletion snapshot is returned
  const filteredSnapshots =
    await api.functional.shoppingMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          deleted_at_after: true,
        },
      },
    );
  typia.assert(filteredSnapshots);
  // 13. Validate that filtering returns exactly one snapshot (the deletion snapshot)
  TestValidator.equals(
    "filtered snapshots count is 1",
    filteredSnapshots.data.length,
    1,
  );
  // 14. Validate that the filtered snapshot has correct deletion properties
  if (filteredSnapshots.data.length > 0) {
    const filteredSnapshot = filteredSnapshots.data[0];
    typia.assert(filteredSnapshot);
    TestValidator.predicate(
      "filtered snapshot deleted_at_after is non-null",
      filteredSnapshot.deleted_at_after !== null,
    );
    TestValidator.equals(
      "filtered snapshot deleted_at_before is null",
      filteredSnapshot.deleted_at_before,
      null,
    );
  }
}
