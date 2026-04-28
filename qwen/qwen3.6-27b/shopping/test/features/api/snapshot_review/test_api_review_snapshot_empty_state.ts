import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformReview";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformSnapshotReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformSnapshotReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformSnapshotReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin browsing review snapshots in empty state with no records in the system.
 *
 * Validates that querying the admin snapshot reviews endpoint when no review snapshots exist returns an empty dataset with correct pagination metadata. Ensures the API handles the edge case of an empty audit trail gracefully.
 *
 * Verifies that the response contains an empty data array and pagination showing records=0 and pages=0 with default values for current page and limit.
 *
 * 1. Admin registers a new account with randomized credentials via join.
 * 2. Admin queries snapshot reviews with no filters applied.
 * 3. Validates empty data array (length 0).
 * 4. Validates pagination: current=1, limit=100, records=0, pages=0.
 */
export async function test_api_review_snapshot_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication via join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {} satisfies Partial<IEcommercePlatformAdmin.IJoin>,
  });
  typia.assert(adminAuthorized);
  // 2. Query snapshot reviews with no filters (empty state)
  const body = {} satisfies IEcommercePlatformSnapshotReview.IRequest;
  const snapshots =
    await api.functional.ecommercePlatform.admin.snapshot_reviews.index(
      adminConnection,
      { body },
    );
  typia.assert(snapshots);
  // 3. Validate empty data array
  TestValidator.equals("empty snapshot review data", snapshots.data.length, 0);
  // 4. Validate pagination metadata for empty state
  TestValidator.equals(
    "pagination current page",
    snapshots.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", snapshots.pagination.limit, 100);
  TestValidator.equals(
    "pagination records count",
    snapshots.pagination.records,
    0,
  );
  TestValidator.equals("pagination total pages", snapshots.pagination.pages, 0);
}
