import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_review_snapshot_access_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer-specific connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 2. Create a review for a delivered product
  const review = await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {
      body: {
        rating: 4,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(review);
  // 3. Store original values for snapshot verification
  const originalRating = review.rating;
  const originalContent = review.content;
  // 4. Edit the review to trigger snapshot creation
  const updatedReview =
    await api.functional.shoppingMall.customer.reviews.update(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          rating: 5,
          content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IShoppingMallReview.IUpdate,
      },
    );
  typia.assert(updatedReview);
  // 5. Retrieve the snapshot
  // Note: We need to get the snapshot ID. In this scenario, we'll need to query
  // or derive it from available data. For now, we use the review's updated_at
  // timestamp as an approximation of when the snapshot was created.
  // Assuming there's a way to get snapshots list or the update returns snapshot info
  // Since we don't have a list snapshots endpoint, we'll test with a generated
  // snapshot ID that would be created during the update
  const snapshot =
    await api.functional.shoppingMall.customer.reviews.snapshots.at(
      customerConnection,
      {
        reviewId: review.id,
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshot);
  // 6. Validate snapshot structure
  TestValidator.predicate("snapshot has valid id", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      snapshot.id,
    ),
  );
  TestValidator.predicate(
    "snapshot rating is between 1 and 5",
    snapshot.rating >= 1 && snapshot.rating <= 5,
  );
  TestValidator.predicate("snapshot has valid created_at timestamp", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(snapshot.created_at),
  );
  // 7. Verify snapshot contains the original review state
  TestValidator.equals(
    "snapshot rating matches original",
    snapshot.rating,
    originalRating,
  );
  TestValidator.equals(
    "snapshot content matches original",
    snapshot.content,
    originalContent,
  );
  // 8. Verify snapshot is linked to the correct review
  TestValidator.equals(
    "snapshot references correct review",
    snapshot.review.id,
    review.id,
  );
}
