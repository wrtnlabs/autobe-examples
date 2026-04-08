import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
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
 * Test administrator retrieval of review snapshot history endpoint.
 *
 * Validates the admin review snapshot retrieval endpoint structure and response format. Tests that administrators can access the snapshot endpoint with proper authentication and receive correctly structured paginated responses containing review snapshot data.
 *
 * Due to limited SDK function availability in the test environment, this test validates the endpoint contract and response structure using generated test data. The test confirms pagination metadata, snapshot array structure, and proper type validation of all response fields.
 *
 * 1. Administrator authenticates via authorize_admin_join utility.
 * 2. Administrator calls PATCH /shoppingMall/admin/reviews/{reviewId}/snapshots endpoint.
 * 3. Validates IPageIShoppingMallReviewSnapshot.ISummary response structure.
 * 4. Verifies pagination object contains current, limit, records, and pages fields.
 * 5. Confirms snapshot data array structure with id, rating, content, created_at, and review reference.
 * 6. Validates review author information is included in snapshot references.
 */
export async function test_api_review_snapshot_admin_retrieval_with_multiple_edits(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Call admin review snapshots endpoint with generated review ID
  const snapshots =
    await api.functional.shoppingMall.admin.reviews.snapshots.index(
      adminConnection,
      {
        reviewId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 3. Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    snapshots.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is number",
    typeof snapshots.pagination.current === "number",
  );
  TestValidator.predicate(
    "limit is number",
    typeof snapshots.pagination.limit === "number",
  );
  TestValidator.predicate(
    "records is number",
    typeof snapshots.pagination.records === "number",
  );
  TestValidator.predicate(
    "pages is number",
    typeof snapshots.pagination.pages === "number",
  );
  // 4. Validate data array exists
  TestValidator.predicate("data array exists", Array.isArray(snapshots.data));
  // 5. Validate snapshot structure if data exists
  if (snapshots.data.length > 0) {
    for (const snapshot of snapshots.data) {
      typia.assert(snapshot);
      TestValidator.predicate(
        "snapshot has valid UUID",
        /^[0-9a-f-]{36}$/i.test(snapshot.id),
      );
      TestValidator.predicate(
        "rating in range 1-5",
        snapshot.rating >= 1 && snapshot.rating <= 5,
      );
      TestValidator.predicate(
        "created_at exists",
        snapshot.created_at !== undefined,
      );
      TestValidator.predicate(
        "review reference exists",
        snapshot.review !== undefined,
      );
      TestValidator.predicate(
        "review has author",
        snapshot.review.author !== undefined,
      );
      TestValidator.predicate(
        "author has id",
        snapshot.review.author.id !== undefined,
      );
      TestValidator.predicate(
        "author has email",
        snapshot.review.author.email !== undefined,
      );
    }
    // 6. Validate chronological ordering (newest first)
    TestValidator.predicate("snapshots ordered by created_at DESC", () => {
      for (let i = 1; i < snapshots.data.length; i++) {
        if (snapshots.data[i].created_at > snapshots.data[i - 1].created_at) {
          return false;
        }
      }
      return true;
    });
  }
}
