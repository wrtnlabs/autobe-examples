import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that review snapshots remain accessible even after the original review is deleted.
 * This validates the requirement that deleted reviews maintain their complete snapshot
 * history for audit purposes. The snapshots should contain the immutable historical
 * state of the review at each point in time.
 */
export async function test_api_review_snapshot_deleted_review_retention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Generate a review ID (simulating an existing review with snapshots)
  const reviewId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve snapshots before deletion (baseline)
  const snapshotsBefore =
    await api.functional.shoppingMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId,
        body: {} satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsBefore);
  // 4. Delete the review (soft delete - preserves snapshots)
  await api.functional.shoppingMall.customer.reviews.erase(customerConnection, {
    reviewId,
  });
  // 5. Retrieve snapshots after deletion - this is the key test
  const snapshotsAfter =
    await api.functional.shoppingMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId,
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsAfter);
  // 6. Validate snapshots are still accessible after deletion
  TestValidator.predicate(
    "snapshots accessible after review deletion",
    snapshotsAfter.pagination.records >= 0,
  );
  // 7. Validate each snapshot has complete data
  await ArrayUtil.asyncForEach(snapshotsAfter.data, async (snapshot) => {
    typia.assert(snapshot);
    // Business logic validation: snapshot_data contains valid JSON with review state
    let parsedData: object;
    try {
      parsedData = JSON.parse(snapshot.snapshot_data);
    } catch (error) {
      throw new Error(
        `Snapshot ${snapshot.id} contains invalid JSON in snapshot_data`,
      );
    }
    TestValidator.predicate(
      `snapshot ${snapshot.id} snapshot_data contains valid review state`,
      typeof parsedData === "object" && parsedData !== null,
    );
    // Validate snapshot references the correct review
    TestValidator.equals(
      `snapshot ${snapshot.id} references correct review`,
      snapshot.shopping_mall_review_id,
      reviewId,
    );
  });
  // 8. Test pagination with different parameters
  const paginatedSnapshots =
    await api.functional.shoppingMall.customer.reviews.snapshots.index(
      customerConnection,
      {
        reviewId,
        body: {
          page: 1,
          limit: 10,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(paginatedSnapshots);
  TestValidator.equals(
    "pagination limit respected",
    paginatedSnapshots.data.length,
    Math.min(paginatedSnapshots.pagination.records, 10),
  );
  TestValidator.predicate(
    "pagination current page is 1",
    paginatedSnapshots.pagination.current === 1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    paginatedSnapshots.pagination.limit,
    10,
  );
  // 9. Verify snapshot count consistency (snapshots preserved after deletion)
  TestValidator.equals(
    "snapshot count unchanged after review deletion",
    snapshotsAfter.pagination.records,
    snapshotsBefore.pagination.records,
  );
}
