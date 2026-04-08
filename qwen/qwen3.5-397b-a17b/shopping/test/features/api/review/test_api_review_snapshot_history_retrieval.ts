import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_reviews_create } from "../../../generate/generate_random_shopping_mall_member_reviews_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";

/**
 * Test review snapshot history retrieval for edited reviews.
 *
 * Validates the complete review snapshot workflow including member authentication, review creation, multiple review edits creating snapshots, and snapshot history retrieval. Ensures that each edit creates an immutable snapshot preserving the previous state.
 *
 * Special attention is given to verifying that snapshots are ordered by created_at DESC (newest first) and that each snapshot accurately preserves the rating and content values from before each edit operation.
 *
 * 1. Member registers and authenticates via authorize_member_join.
 * 2. Member creates a review with rating 5 and content 'Initial review'.
 * 3. Member updates review to rating 4 and content 'Updated review' (creates first snapshot).
 * 4. Member updates review again to rating 3 and content 'Final review' (creates second snapshot).
 * 5. Member retrieves snapshot history via PATCH /reviews/{reviewId}/snapshots.
 * 6. Validates response contains exactly 2 snapshots in correct order.
 * 7. Validates first snapshot contains rating 4 and content 'Updated review'.
 * 8. Validates second snapshot contains rating 5 and content 'Initial review'.
 * 9. Validates pagination metadata shows total records count of 2.
 */
export async function test_api_review_snapshot_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create initial review with rating 5 and content 'Initial review'
  const initialReview =
    await generate_random_shopping_mall_member_reviews_create(
      memberConnection,
      {
        body: {
          rating: 5,
          content: "Initial review",
        } satisfies Partial<IShoppingMallReview.ICreate>,
      },
    );
  typia.assert(initialReview);
  // 3. First update: rating 4, content 'Updated review' (creates first snapshot)
  const firstUpdate = await api.functional.shoppingMall.member.reviews.update(
    memberConnection,
    {
      reviewId: initialReview.id,
      body: {
        rating: 4,
        content: "Updated review",
      } satisfies IShoppingMallReview.IUpdate,
    },
  );
  typia.assert(firstUpdate);
  // 4. Second update: rating 3, content 'Final review' (creates second snapshot)
  const secondUpdate = await api.functional.shoppingMall.member.reviews.update(
    memberConnection,
    {
      reviewId: initialReview.id,
      body: {
        rating: 3,
        content: "Final review",
      } satisfies IShoppingMallReview.IUpdate,
    },
  );
  typia.assert(secondUpdate);
  // 5. Retrieve snapshot history
  const snapshotHistory =
    await api.functional.shoppingMall.member.reviews.snapshots.index(
      memberConnection,
      {
        reviewId: initialReview.id,
        body: {
          page: 1,
          limit: 10,
          sort: "-created_at",
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(snapshotHistory);
  // 6. Validate pagination metadata
  TestValidator.equals("snapshot count", snapshotHistory.pagination.records, 2);
  TestValidator.equals("total pages", snapshotHistory.pagination.pages, 1);
  TestValidator.equals("current page", snapshotHistory.pagination.current, 1);
  // 7. Validate data array contains exactly 2 snapshots
  TestValidator.equals("data array length", snapshotHistory.data.length, 2);
  // 8. Validate first snapshot (most recent edit - state before second update)
  const firstSnapshot = snapshotHistory.data[0];
  TestValidator.equals("first snapshot rating", firstSnapshot.rating, 4);
  TestValidator.equals(
    "first snapshot content",
    firstSnapshot.content,
    "Updated review",
  );
  // 9. Validate second snapshot (state before first update)
  const secondSnapshot = snapshotHistory.data[1];
  TestValidator.equals("second snapshot rating", secondSnapshot.rating, 5);
  TestValidator.equals(
    "second snapshot content",
    secondSnapshot.content,
    "Initial review",
  );
  // 10. Validate snapshots are ordered by created_at DESC
  const firstSnapshotDate = new Date(firstSnapshot.created_at).getTime();
  const secondSnapshotDate = new Date(secondSnapshot.created_at).getTime();
  TestValidator.predicate(
    "snapshots ordered by created_at DESC",
    firstSnapshotDate > secondSnapshotDate,
  );
}
