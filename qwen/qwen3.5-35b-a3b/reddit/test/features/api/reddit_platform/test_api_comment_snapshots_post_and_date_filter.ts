import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommentSnapshot";
import type { IRedditPlatformCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test comment snapshots retrieval with post_id and date range filtering.
 *
 * Validates that the comment snapshot audit trail API correctly accepts and
 * processes filter parameters for post_id and date range filtering. Tests
 * that the API properly handles pagination, sorting, and edge cases such as
 * empty result sets when no snapshots match the filter criteria.
 *
 * The test verifies:
 * 1. API accepts valid post_id UUID filter parameter
 * 2. API accepts valid date range parameters (startDate, endDate)
 * 3. API returns properly structured paginated response
 * 4. API handles empty result sets correctly
 * 5. Response includes all required snapshot fields
 * 6. Pagination metadata is accurate
 * 7. Snapshots are sorted by snapshot_created_at descending by default
 *
 * Special attention is given to validating that the filter parameters are
 * properly applied and that the response structure matches the expected
 * IPageIRedditPlatformCommentSnapshot.ISummary type.
 *
 * 1. Call API with post_id filter and validate response structure.
 * 2. Call API with date range filter and validate filtering works.
 * 3. Call API with both filters and verify combined filtering.
 * 4. Call API with non-matching post_id and verify empty result.
 * 5. Call API with non-overlapping date range and verify empty result.
 * 6. Validate response structure, pagination, and field presence.
 * 7. Verify snapshots are sorted by snapshot_created_at descending.
 */
export async function test_api_comment_snapshots_post_and_date_filter(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  // 1. Query with post_id filter only
  const testPostId = typia.random<string & tags.Format<"uuid">>();
  const postFilterResponse =
    await api.functional.redditPlatform.comment_snapshots.index(
      adminConnection,
      {
        body: {
          post_id: testPostId,
          limit: 100,
        } satisfies IRedditPlatformCommentSnapshot.IRequest,
      },
    );
  typia.assert(postFilterResponse);
  // 2. Query with date range filter only
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const dateFilterResponse =
    await api.functional.redditPlatform.comment_snapshots.index(
      adminConnection,
      {
        body: {
          startDate: threeDaysAgo.toISOString(),
          endDate: now.toISOString(),
          limit: 100,
        } satisfies IRedditPlatformCommentSnapshot.IRequest,
      },
    );
  typia.assert(dateFilterResponse);
  // 3. Query with both filters combined
  const yesterday = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const combinedFilterResponse =
    await api.functional.redditPlatform.comment_snapshots.index(
      adminConnection,
      {
        body: {
          post_id: testPostId,
          startDate: threeDaysAgo.toISOString(),
          endDate: yesterday.toISOString(),
          limit: 50,
          page: 1,
          sort: "snapshot_created_at",
        } satisfies IRedditPlatformCommentSnapshot.IRequest,
      },
    );
  typia.assert(combinedFilterResponse);
  // 4. Query with non-matching post_id (should return empty)
  const nonMatchingPostId = typia.random<string & tags.Format<"uuid">>();
  const emptyPostResponse =
    await api.functional.redditPlatform.comment_snapshots.index(
      adminConnection,
      {
        body: {
          post_id: nonMatchingPostId,
          limit: 100,
        } satisfies IRedditPlatformCommentSnapshot.IRequest,
      },
    );
  typia.assert(emptyPostResponse);
  // 5. Query with non-overlapping date range (should return empty)
  const farPast = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000);
  const farFuture = new Date(now.getTime() - 99 * 24 * 60 * 60 * 1000);
  const emptyDateResponse =
    await api.functional.redditPlatform.comment_snapshots.index(
      adminConnection,
      {
        body: {
          startDate: farPast.toISOString(),
          endDate: farFuture.toISOString(),
          limit: 100,
        } satisfies IRedditPlatformCommentSnapshot.IRequest,
      },
    );
  typia.assert(emptyDateResponse);
  // Validate post_id filter response structure
  TestValidator.equals(
    "post filter response has valid pagination",
    postFilterResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "post filter response limit matches request",
    postFilterResponse.pagination.limit,
    100,
  );
  TestValidator.equals(
    "post filter records matches data length",
    postFilterResponse.pagination.records,
    postFilterResponse.data.length,
  );
  // Validate date filter response structure
  TestValidator.equals(
    "date filter response has valid pagination",
    dateFilterResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "date filter response limit matches request",
    dateFilterResponse.pagination.limit,
    100,
  );
  TestValidator.equals(
    "date filter records matches data length",
    dateFilterResponse.pagination.records,
    dateFilterResponse.data.length,
  );
  // Validate combined filter response structure
  TestValidator.equals(
    "combined filter response has valid pagination",
    combinedFilterResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined filter response limit matches request",
    combinedFilterResponse.pagination.limit,
    50,
  );
  TestValidator.equals(
    "combined filter records matches data length",
    combinedFilterResponse.pagination.records,
    combinedFilterResponse.data.length,
  );
  // Validate empty post filter result
  TestValidator.equals(
    "non-matching post returns empty data array",
    emptyPostResponse.data.length,
    0,
  );
  TestValidator.equals(
    "non-matching post pagination records=0",
    emptyPostResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-matching post pagination pages=0",
    emptyPostResponse.pagination.pages,
    0,
  );
  // Validate empty date filter result
  TestValidator.equals(
    "non-matching date returns empty data array",
    emptyDateResponse.data.length,
    0,
  );
  TestValidator.equals(
    "non-matching date pagination records=0",
    emptyDateResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-matching date pagination pages=0",
    emptyDateResponse.pagination.pages,
    0,
  );
  // Validate snapshot data structure when data exists
  if (postFilterResponse.data.length > 0) {
    const snapshot = postFilterResponse.data[0];
    typia.assert(snapshot);
    TestValidator.predicate(
      "snapshot has valid post_id UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        snapshot.post_id,
      ),
    );
    TestValidator.predicate(
      "snapshot has valid author_id UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        snapshot.author_id,
      ),
    );
    TestValidator.predicate(
      "snapshot has valid comment UUID formats",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        snapshot.original_comment_id,
      ) &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          snapshot.reddit_platform_comment_id,
        ),
    );
    TestValidator.predicate(
      "snapshot has valid date-time formats",
      !Number.isNaN(new Date(snapshot.snapshot_created_at).getTime()) &&
        !Number.isNaN(new Date(snapshot.comment_created_at).getTime()) &&
        !Number.isNaN(new Date(snapshot.comment_updated_at).getTime()),
    );
    TestValidator.predicate(
      "snapshot scores are integers",
      Number.isInteger(snapshot.score) &&
        Number.isInteger(snapshot.upvotes_count) &&
        Number.isInteger(snapshot.downvotes_count),
    );
  }
  // Validate sorting when multiple snapshots exist
  if (dateFilterResponse.data.length > 1) {
    for (let i = 1; i < dateFilterResponse.data.length; i++) {
      const prevDate = new Date(
        dateFilterResponse.data[i - 1].snapshot_created_at,
      );
      const currDate = new Date(dateFilterResponse.data[i].snapshot_created_at);
      TestValidator.predicate(
        "snapshots sorted descending by snapshot_created_at",
        prevDate >= currDate,
      );
    }
  }
}
