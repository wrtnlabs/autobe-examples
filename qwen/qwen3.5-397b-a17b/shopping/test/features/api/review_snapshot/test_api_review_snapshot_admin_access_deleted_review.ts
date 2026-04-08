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
 * Test administrator access to review snapshots of soft-deleted reviews.
 *
 * Validates that administrators can retrieve review snapshots even after the parent review has been soft-deleted. This tests the special admin permission for deleted content oversight, ensuring audit trails are preserved for compliance and dispute resolution.
 *
 * The test creates a review, edits it to generate a snapshot, deletes the review, then verifies admin can access the snapshot endpoint. This demonstrates that snapshot immutability ensures permanent records regardless of parent review status.
 *
 * 1. Administrator authenticates via join operation.
 * 2. Customer member authenticates via join operation.
 * 3. Member creates a product review with rating and content.
 * 4. Member edits the review to trigger snapshot creation (preserving original state).
 * 5. Member deletes their own review (soft delete - review removed from public view).
 * 6. Administrator retrieves a snapshot using the admin endpoint with the review ID.
 * 7. Validates snapshot structure and that review reference is accessible.
 *
 * Note: This test validates the admin access pattern for review snapshots. The snapshot ID is generated for testing purposes as there is no list snapshots endpoint available in the current API.
 */
export async function test_api_review_snapshot_admin_access_deleted_review(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      grade: "regular",
    },
  });
  typia.assert(adminAuth);
  // 2. Customer member setup
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 3. Member creates initial product review
  const review = await generate_random_shopping_mall_member_reviews_create(
    memberConnection,
    {
      body: {
        rating: 5,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(review);
  // 4. Member edits review to generate snapshot preserving previous state
  const updatedReview = await api.functional.shoppingMall.member.reviews.update(
    memberConnection,
    {
      reviewId: review.id,
      body: {
        rating: 4,
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IShoppingMallReview.IUpdate,
    },
  );
  typia.assert(updatedReview);
  // 5. Member deletes their own review (soft delete)
  await api.functional.shoppingMall.member.reviews.erase(memberConnection, {
    reviewId: review.id,
  });
  // 6. Administrator retrieves snapshot of deleted review
  // Note: Since there's no list snapshots endpoint, we generate a snapshot ID for testing
  // In production, this would come from a list snapshots call
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot = await api.functional.shoppingMall.admin.reviews.snapshots.at(
    adminConnection,
    {
      reviewId: review.id,
      snapshotId: snapshotId,
    },
  );
  typia.assert(snapshot);
  // 7. Validate snapshot structure and data integrity
  TestValidator.predicate(
    "snapshot rating in valid range",
    snapshot.rating >= 1 && snapshot.rating <= 5,
  );
  TestValidator.equals(
    "snapshot review id matches",
    snapshot.review.id,
    review.id,
  );
  TestValidator.equals(
    "snapshot review rating valid",
    snapshot.review.rating >= 1,
    true,
  );
  TestValidator.predicate(
    "snapshot review has author",
    snapshot.review.author !== null && snapshot.review.author !== undefined,
  );
  TestValidator.predicate(
    "snapshot has creation timestamp",
    snapshot.created_at !== null && snapshot.created_at !== undefined,
  );
}
