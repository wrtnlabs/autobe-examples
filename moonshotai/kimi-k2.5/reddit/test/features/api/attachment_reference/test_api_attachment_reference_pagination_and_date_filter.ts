import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeAttachmentReference";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachmentReference";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test pagination and date range filtering for attachment references.
 * Guest user calls the endpoint with page=2, limit=10, and created_at_from set to a recent timestamp.
 * Verify the response shows correct pagination metadata - current page should be 2, limit should be 10,
 * and data array should contain at most 10 records. Also verify date filtering excludes records created
 * before the specified timestamp. This validates both pagination controls and date range filtering work
 * correctly together.
 */
export async function test_api_attachment_reference_pagination_and_date_filter(
  connection: api.IConnection,
): Promise<void> {
  // Calculate a recent timestamp for date filtering (1 hour ago)
  const recentTimestamp = new Date();
  recentTimestamp.setHours(recentTimestamp.getHours() - 1);
  const createdAtFrom = recentTimestamp.toISOString();
  // Call the endpoint with pagination and date filter parameters
  const response: IPageIRedditLikeAttachmentReference.ISummary =
    await api.functional.redditLike.attachment_references.index(connection, {
      body: {
        page: 2,
        limit: 10,
        created_at_from: createdAtFrom,
      } satisfies IRedditLikeAttachmentReference.IRequest,
    });
  // Validate response structure
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.equals(
    "current page should be 2",
    response.pagination.current,
    2,
  );
  TestValidator.equals("limit should be 10", response.pagination.limit, 10);
  // Validate data array length does not exceed limit
  TestValidator.predicate(
    "data array length should not exceed limit",
    response.data.length <= response.pagination.limit,
  );
  // Validate date filtering - all records should have createdAt >= created_at_from
  const cutoffDate = new Date(createdAtFrom).getTime();
  const allRecordsAfterCutoff = response.data.every(
    (item) => new Date(item.createdAt).getTime() >= cutoffDate,
  );
  TestValidator.predicate(
    "all records should be created after or at the cutoff timestamp",
    allRecordsAfterCutoff,
  );
}
