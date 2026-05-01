import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewReviewSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallReviewReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin retrieval of review snapshot edit history with default pagination.
 *
 * Validates that an authenticated administrator can access the complete snapshot edit history of any review. The test verifies the API endpoint returns properly typed paginated results with correct pagination metadata including current page, limit, total records, and total pages.
 *
 * When snapshots exist in the response, the test additionally verifies they are ordered by created_at in descending order (newest edit first), ensuring the audit trail is presented chronologically from most recent to oldest edit.
 *
 * 1. Administrator registers and authenticates via join.
 * 2. Retrieves review snapshots with default pagination (page 1, limit 20, no filters).
 * 3. Validates response structure and pagination metadata correctness.
 * 4. Validates snapshot ordering (newest first) when multiple snapshots exist.
 */
export async function test_api_review_snapshot_history_admin_browse(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Retrieve review snapshots with default pagination
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  const result =
    await api.functional.shoppingMall.admin.reviews.snapshots.index(
      adminConnection,
      {
        reviewId,
        body: {} satisfies IShoppingMallReviewReviewSnapshot.IRequest,
      },
    );
  typia.assert(result);
  // 3. Validate pagination metadata
  TestValidator.equals("default page is 1", result.pagination.current, 1);
  TestValidator.equals("default limit is 20", result.pagination.limit, 20);
  TestValidator.predicate(
    "records count non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count non-negative",
    result.pagination.pages >= 0,
  );
  // 4. Validate snapshot ordering (newest first)
  if (result.data.length > 1) {
    for (let i = 0; i < result.data.length - 1; i++) {
      TestValidator.predicate(
        `snapshot order: index ${i} newer than ${i + 1}`,
        new Date(result.data[i].created_at).getTime() >=
          new Date(result.data[i + 1].created_at).getTime(),
      );
    }
  }
}
