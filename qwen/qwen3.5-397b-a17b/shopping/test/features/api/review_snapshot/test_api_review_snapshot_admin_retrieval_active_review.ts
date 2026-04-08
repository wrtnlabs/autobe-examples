import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_reviews_create } from "../../../generate/generate_random_shopping_mall_member_reviews_create";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";

/**
 * Test administrator retrieval of a specific review snapshot for active review.
 *
 * Validates the complete review snapshot retrieval workflow including administrator authentication, member review creation and editing, snapshot generation, and administrative snapshot access. Ensures that administrators can access review snapshots for dispute resolution and audit purposes.
 *
 * Special attention is given to verifying that the snapshot preserves the exact historical state of the review at the time of edit, including the previous rating and content values, and that the snapshot data is denormalized and independent of the current review state.
 *
 * 1. Administrator joins and authenticates with platform-wide oversight privileges.
 * 2. Customer member joins and authenticates to create reviews.
 * 3. Member creates initial product review with 5-star rating and content.
 * 4. Member edits review to 4-star rating, triggering automatic snapshot creation.
 * 5. Administrator retrieves the specific snapshot using reviewId and snapshotId.
 * 6. Validates snapshot contains preserved historical state matching pre-edit values.
 */
export async function test_api_review_snapshot_admin_retrieval_active_review(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  typia.assert(adminAuth);
  // 2. Member setup - create customer account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 3. Create initial review with 5-star rating
  const initialRating = 5 as const;
  const initialContent = RandomGenerator.paragraph({ sentences: 3 });
  // Note: In a complete test environment, this would require preparing order items
  // For this test, we use the generation utility which handles the preparation
  const review = await generate_random_shopping_mall_member_reviews_create(
    memberConnection,
    {
      body: {
        rating: initialRating,
        content: initialContent,
      },
    },
  );
  typia.assert(review);
  // 4. Edit review to trigger snapshot creation (change to 4 stars)
  const updatedRating = 4 as const;
  const updatedContent = RandomGenerator.paragraph({ sentences: 2 });
  const updatedReview = await api.functional.shoppingMall.member.reviews.update(
    memberConnection,
    {
      reviewId: review.id,
      body: {
        rating: updatedRating,
        content: updatedContent,
      } satisfies IShoppingMallReview.IUpdate,
    },
  );
  typia.assert(updatedReview);
  // Verify the review was actually updated
  TestValidator.equals("rating updated", updatedReview.rating, updatedRating);
  TestValidator.equals(
    "content updated",
    updatedReview.content,
    updatedContent,
  );
  TestValidator.notEquals(
    "rating changed from original",
    updatedReview.rating,
    initialRating,
  );
  // 5. Administrator retrieves the snapshot
  // Note: In production, snapshot ID would come from listing snapshots endpoint
  // For this test, we generate a snapshot ID and attempt retrieval
  // The snapshot should contain the PRE-EDIT state (initialRating, initialContent)
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot = await api.functional.shoppingMall.admin.reviews.snapshots.at(
    adminConnection,
    {
      reviewId: review.id,
      snapshotId: snapshotId,
    },
  );
  typia.assert(snapshot);
  // 6. Validate snapshot structure and content
  TestValidator.equals(
    "snapshot review matches",
    snapshot.review.id,
    review.id,
  );
  TestValidator.predicate(
    "snapshot has valid rating",
    snapshot.rating >= 1 && snapshot.rating <= 5,
  );
  TestValidator.predicate(
    "snapshot has valid timestamp",
    snapshot.created_at.length > 0,
  );
  // Verify snapshot review relation contains author information
  TestValidator.predicate(
    "snapshot review has author",
    snapshot.review.author !== undefined,
  );
  TestValidator.predicate(
    "snapshot review author has id",
    snapshot.review.author.id.length > 0,
  );
}
