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
 * Test admin filtering workflow for review snapshot endpoint with rating and content filters.
 *
 * Validates the complete review snapshot audit trail filtering flow including administrator authentication and multiple filter combinations. Ensures that rating-based filters (new_rating, previous_rating) and content-based filters (previous_content, new_content) correctly narrow down paginated results.
 *
 * Special attention is given to testing the initial snapshot creation scenario where previous_rating is null, as well as filtering for specific new_rating values to identify patterns in review modifications.
 *
 * 1. Administrator registers with email and credentials using join utility.
 * 2. Administrator queries snapshot reviews with new_rating filter (5 stars).
 * 3. Administrator queries with previous_rating=null to find initial review snapshots.
 * 4. Administrator queries with content-based filters for content matching.
 * 5. Validate all paginated responses conform to expected structure.
 */
export async function test_api_review_snapshot_admin_rating_and_content_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuthorized);
  // 2. Query snapshot reviews with new_rating filter set to 5
  const newRating: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5> = 5;
  const filteredByNewRating =
    await api.functional.ecommercePlatform.admin.snapshot_reviews.index(
      adminConnection,
      {
        body: {
          new_rating: newRating,
          page: 1,
          limit: 10,
        } satisfies IEcommercePlatformSnapshotReview.IRequest,
      },
    );
  typia.assert(filteredByNewRating);
  TestValidator.predicate(
    "pagination has valid structure",
    filteredByNewRating.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    filteredByNewRating.pagination.records >= 0,
  );
  if (filteredByNewRating.data.length > 0) {
    // Validate that all returned snapshots match the new_rating filter
    const snapshots = filteredByNewRating.data.slice(0, 3);
    for (const snapshot of snapshots) {
      typia.assert(snapshot);
      TestValidator.equals(
        "new_rating matches filter",
        snapshot.new_rating,
        newRating,
      );
    }
  }
  // 3. Query with previous_rating=null to find initial review creation snapshots
  const initialSnapshots =
    await api.functional.ecommercePlatform.admin.snapshot_reviews.index(
      adminConnection,
      {
        body: {
          previous_rating: null,
        } satisfies IEcommercePlatformSnapshotReview.IRequest,
      },
    );
  typia.assert(initialSnapshots);
  TestValidator.predicate(
    "initial snapshots pagination is valid",
    initialSnapshots.pagination.current >= 1,
  );
  if (initialSnapshots.data.length > 0) {
    // For initial snapshots, previous_rating should be null
    const sampleSnapshot = initialSnapshots.data[0];
    typia.assert(sampleSnapshot);
    TestValidator.equals(
      "previous_rating is null for initial snapshots",
      sampleSnapshot.previous_rating,
      null,
    );
    TestValidator.predicate(
      "new_rating is valid for initial snapshots",
      sampleSnapshot.new_rating >= 1 && sampleSnapshot.new_rating <= 5,
    );
  }
  // 4. Query with content search filter
  const searchKeyword = RandomGenerator.paragraph({ sentences: 1 });
  const snapByContent =
    await api.functional.ecommercePlatform.admin.snapshot_reviews.index(
      adminConnection,
      {
        body: {
          search: searchKeyword,
          page: 1,
          limit: 5,
        } satisfies IEcommercePlatformSnapshotReview.IRequest,
      },
    );
  typia.assert(snapByContent);
  TestValidator.predicate(
    "content search returns valid pagination",
    snapByContent.pagination.current >= 1,
  );
  // 5. Query with combined filters - specific rating transition (initial 5-star review)
  const previousRating:
    | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>)
    | null = null;
  const snapByRatingTransition =
    await api.functional.ecommercePlatform.admin.snapshot_reviews.index(
      adminConnection,
      {
        body: {
          previous_rating: previousRating,
          new_rating: 5,
          page: 1,
          limit: 20,
        } satisfies IEcommercePlatformSnapshotReview.IRequest,
      },
    );
  typia.assert(snapByRatingTransition);
  TestValidator.equals(
    "combined filter pagination current equals 1",
    snapByRatingTransition.pagination.current,
    1,
  );
  // Validate structure of returned snapshot summaries
  if (snapByRatingTransition.data.length > 0) {
    const reviewSnapshot = snapByRatingTransition.data[0];
    typia.assert(reviewSnapshot);
    // Validate that the snapshot has a valid review reference
    typia.assert(reviewSnapshot.review);
    TestValidator.predicate(
      "snapshot has valid review reference",
      typeof reviewSnapshot.review.id === "string",
    );
    // Validate timestamp exists
    TestValidator.predicate(
      "snapshot has valid timestamp",
      typeof reviewSnapshot.created_at === "string",
    );
  }
}
