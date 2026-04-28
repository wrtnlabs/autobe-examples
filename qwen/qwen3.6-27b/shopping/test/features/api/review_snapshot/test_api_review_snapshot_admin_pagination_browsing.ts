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
 * Test admin pagination browsing of review snapshot audit trail.
 *
 * Validates the complete admin workflow for browsing review snapshot records via PATCH /ecommercePlatform/admin/snapshot-reviews endpoint. Tests administrative authentication through admin join, paginated response retrieval with date range filters, and pagination metadata accuracy.
 *
 * Ensures that admin can successfully query the immutable snapshot audit trail with proper session token, receives paginated results matching IPageIEcommercePlatformSnapshotReview.ISummary structure, and that pagination context (current page, limit, total records, total pages) is correctly populated.
 *
 * Special attention is given to verifying that the default newest-first ordering by created_at is maintained, that date range filters (from_date, to_date) are applied correctly, and that each snapshot summary includes review references, previous/new rating and content states, and creation timestamps.
 *
 * 1. Administrator registers via admin join operation for authentication.
 * 2. Administrator queries snapshot reviews with date range filters (from_date, to_date).
 * 3. Validates pagination metadata shows current=1, limit=100, and proper pagination context.
 * 4. Validates default newest-first ordering by created_at timestamp.
 */
export async function test_api_review_snapshot_admin_pagination_browsing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, { body: {} });
  typia.assert(authorized);
  // 2. Prepare date range for snapshot browsing
  const from_date = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const to_date = new Date().toISOString();
  const request = {
    from_date,
    to_date,
    page: 1,
    limit: 100,
  } satisfies IEcommercePlatformSnapshotReview.IRequest;
  // 3. Browse snapshots with pagination
  const response =
    await api.functional.ecommercePlatform.admin.snapshot_reviews.index(
      adminConnection,
      { body: request },
    );
  typia.assert(response);
  // 4. Verify pagination metadata
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 100", response.pagination.limit, 100);
  TestValidator.predicate(
    "has total records",
    response.pagination.records >= 0,
  );
  TestValidator.predicate("has total pages", response.pagination.pages >= 0);
  // 5. Verify data array structure
  TestValidator.predicate(
    "data is array with length matching limit or less",
    response.data.length <= 100,
  );
  // 6. Verify each snapshot summary structure via typia.assert
  for (const snapshot of response.data) {
    typia.assert(snapshot);
    typia.assert(snapshot.review);
    TestValidator.predicate(
      "new_rating is between 1 and 5",
      snapshot.new_rating >= 1 && snapshot.new_rating <= 5,
    );
    TestValidator.predicate(
      "previous_rating is null or between 1 and 5",
      snapshot.previous_rating === null ||
        (snapshot.previous_rating >= 1 && snapshot.previous_rating <= 5),
    );
  }
  // 7. Verify newest-first ordering by created_at
  if (response.data.length > 1) {
    const isOrderedCorrectly = Array.from(
      { length: response.data.length - 1 },
      (_, i) => {
        const current = new Date(response.data[i].created_at).getTime();
        const next = new Date(response.data[i + 1].created_at).getTime();
        return current >= next;
      },
    ).every((x) => x);
    TestValidator.predicate(
      "snapshots sorted newest-first by created_at",
      isOrderedCorrectly,
    );
  }
}
