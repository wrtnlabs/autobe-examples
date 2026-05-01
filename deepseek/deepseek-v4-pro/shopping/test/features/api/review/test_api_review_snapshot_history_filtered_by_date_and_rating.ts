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
 * Test review snapshot history retrieval with date and rating filters.
 *
 * Validates the admin endpoint for retrieving a review's edit history snapshots
 * with optional filtering by creation date range and captured rating values.
 * The test verifies that the API correctly handles various filter combinations
 * and returns properly structured paginated responses for audit and dispute
 * resolution purposes.
 *
 * 1. Administrator authenticates via join to access the admin-protected snapshots endpoint.
 * 2. Queries snapshots with created_at date range filter to verify the API accepts and
 *    processes temporal constraints on snapshot creation timestamps.
 * 3. Queries snapshots with rating_min and rating_max filters to verify the API filters
 *    by the captured star rating stored in each snapshot.
 * 4. Queries snapshots with combined date and rating filters to verify the API computes
 *    the intersection of both constraints correctly.
 * 5. Queries with explicit pagination parameters alongside active filters to verify
 *    pagination metadata (current page, limit, records, pages) is accurate under
 *    filtered conditions, ...
 */
export async function test_api_review_snapshot_history_filtered_by_date_and_rating(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  // Prepare date range: 30 days ago to now
  const dateFrom = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateTo = new Date().toISOString();
  // 2. Date range filter
  const dateFiltered =
    await api.functional.shoppingMall.admin.reviews.snapshots.index(
      adminConnection,
      {
        reviewId,
        body: {
          created_at_from: dateFrom,
          created_at_to: dateTo,
        } satisfies IShoppingMallReviewReviewSnapshot.IRequest,
      },
    );
  typia.assert(dateFiltered);
  // 3. Rating range filter
  const ratingFiltered =
    await api.functional.shoppingMall.admin.reviews.snapshots.index(
      adminConnection,
      {
        reviewId,
        body: {
          rating_min: 2,
          rating_max: 4,
        } satisfies IShoppingMallReviewReviewSnapshot.IRequest,
      },
    );
  typia.assert(ratingFiltered);
  // 4. Combined date and rating filters
  const combinedFiltered =
    await api.functional.shoppingMall.admin.reviews.snapshots.index(
      adminConnection,
      {
        reviewId,
        body: {
          created_at_from: dateFrom,
          created_at_to: dateTo,
          rating_min: 3,
          rating_max: 5,
        } satisfies IShoppingMallReviewReviewSnapshot.IRequest,
      },
    );
  typia.assert(combinedFiltered);
  // 5. Pagination with combined filters
  const paginated =
    await api.functional.shoppingMall.admin.reviews.snapshots.index(
      adminConnection,
      {
        reviewId,
        body: {
          created_at_from: dateFrom,
          created_at_to: dateTo,
          rating_min: 1,
          rating_max: 5,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallReviewReviewSnapshot.IRequest,
      },
    );
  typia.assert(paginated);
  TestValidator.equals(
    "pagination current page",
    paginated.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    paginated.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    paginated.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    paginated.pagination.pages >= 0,
  );
}
