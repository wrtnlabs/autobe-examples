import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_reviews_create } from "../../../generate/generate_random_ecommerce_mall_customer_reviews_create";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";

/**
 * Test successful retrieval of a review snapshot by its author.
 * When an authenticated customer requests a snapshot of their own review,
 * the system returns complete snapshot data including rating, content,
 * and timestamp captured at edit time.
 */
export async function test_api_review_snapshot_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create actor-specific connection and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Step 2: Create a review to establish initial state
  const originalReview =
    await generate_random_ecommerce_mall_customer_reviews_create(
      customerConnection,
      {},
    );
  typia.assert(originalReview);
  // Step 3: Update the review to trigger snapshot creation
  // This preserves the original state as a snapshot
  const updatedRating =
    originalReview.rating === 5 ? 4 : originalReview.rating + 1;
  const updatedReview =
    await api.functional.ecommerceMall.customer.reviews.update(
      customerConnection,
      {
        reviewId: originalReview.id,
        body: {
          rating: updatedRating as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<5>,
          content:
            "Updated review content after modification - " +
            RandomGenerator.alphabets(10),
        } satisfies IEcommerceMallReview.IUpdate,
      },
    );
  typia.assert(updatedReview);
  // Step 4: Verify the update actually changed the rating
  TestValidator.notEquals(
    "review rating was updated",
    updatedReview.rating,
    originalReview.rating,
  );
  // Step 5: Retrieve the snapshot that was created during the update
  const snapshot: IEcommerceMallReviewSnapshot =
    await api.functional.ecommerceMall.customer.reviews.snapshots.at(
      customerConnection,
      {
        reviewId: originalReview.id,
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshot);
  // Step 6: Validate snapshot business logic - references correct review
  TestValidator.equals(
    "snapshot references correct review",
    snapshot.reviewId,
    originalReview.id,
  );
}
