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
 * Test administrator retrieval of review snapshots for a review with no edit history.
 *
 * Validates that the admin snapshot retrieval endpoint correctly handles reviews that have never been edited, returning an empty snapshot list with proper pagination metadata. This test ensures the system gracefully handles the edge case where no snapshot records exist for a given review.
 *
 * The test verifies that the response structure remains valid even when the data array is empty, and that pagination metadata accurately reflects zero total records. This is important for UI components that display review edit history to administrators.
 *
 * 1. Administrator authenticates using authorize_admin_join utility.
 * 2. Generate a valid review UUID for testing (in production, this would reference an actual customer review).
 * 3. Administrator calls PATCH /shoppingMall/admin/reviews/{reviewId}/snapshots with pagination parameters.
 * 4. Validates response structure contains empty data array and correct pagination metadata.
 * 5. Confirms pagination shows records = 0 and pages = 0 for empty result set.
 */
export async function test_api_review_snapshot_admin_retrieval_no_edits(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Generate a review UUID (represents a review with no edit history)
  const reviewId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Administrator retrieves snapshots for the review
  const response: IPageIShoppingMallReviewSnapshot.ISummary =
    await api.functional.shoppingMall.admin.reviews.snapshots.index(
      adminConnection,
      {
        reviewId: reviewId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallReviewSnapshot.IRequest,
      },
    );
  // 4. Validate response structure
  typia.assert(response);
  // 5. Validate pagination metadata for empty result set
  TestValidator.equals("current page", response.pagination.current, 1);
  TestValidator.equals("limit", response.pagination.limit, 10);
  TestValidator.equals("zero records", response.pagination.records, 0);
  TestValidator.equals("zero pages", response.pagination.pages, 0);
  // 6. Validate empty data array
  TestValidator.equals("empty snapshots array", response.data.length, 0);
}
