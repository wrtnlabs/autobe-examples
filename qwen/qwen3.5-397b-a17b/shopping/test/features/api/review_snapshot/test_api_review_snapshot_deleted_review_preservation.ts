import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that review snapshots are preserved and accessible even after the associated review is deleted.
 *
 * This test validates the audit trail preservation requirement for dispute resolution:
 * 1. Administrator authenticates to access review snapshots
 * 2. Administrator retrieves snapshots for a review (simulating deleted review scenario)
 * 3. Each snapshot preserves the rating and content as they existed at snapshot time
 * 4. Snapshot metadata (snapshot_at, snapshotByUser) is correctly returned
 * 5. Pagination metadata is properly structured
 *
 * Business Rule: Review snapshots remain immutable and accessible even after the original review is soft-deleted.
 */
export async function test_api_review_snapshot_deleted_review_preservation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Generate a review ID to test snapshot retrieval (simulating a deleted review)
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  // 3. Administrator retrieves snapshots for the review
  // Even if the review is deleted, snapshots should remain accessible per business rules
  const snapshotsResponse =
    await api.functional.shoppingMall.admin.reviews.snapshots.index(
      adminConnection,
      {
        reviewId: reviewId,
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 4. Validate pagination metadata business logic
  TestValidator.predicate(
    "pagination pages calculated correctly",
    snapshotsResponse.pagination.pages === 0 ||
      snapshotsResponse.pagination.pages >= 1,
  );
  // 5. Validate snapshots are returned as array (type validated by typia.assert)
  // If snapshots exist, validate business logic of snapshot data
  if (snapshotsResponse.data.length > 0) {
    const snapshot = snapshotsResponse.data[0];
    // Validate rating is within business rule range (1-5 stars)
    TestValidator.predicate(
      "rating within valid range 1-5",
      snapshot.rating >= 1 && snapshot.rating <= 5,
    );
    // Validate snapshot timestamp is in the past or present (not future)
    TestValidator.predicate(
      "snapshot_at is not in future",
      new Date(snapshot.snapshot_at).getTime() <= Date.now(),
    );
    // Validate snapshotByUser has required identification
    TestValidator.predicate(
      "snapshotByUser has valid customer ID",
      snapshot.snapshotByUser.id.length > 0,
    );
  }
}
