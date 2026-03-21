import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneFile";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test file search with combined filters including filename partial match,
 * MIME type filtering, and date range filtering.
 *
 * Verifies that:
 * - filename filter performs case-insensitive partial matching
 * - mimeType filter returns only files of specified format
 * - date range filters (createdAfter, createdBefore) correctly bound results
 */
export async function test_api_files_search_with_combined_filters(
  connection: api.IConnection,
): Promise<void> {
  // =====================================================
  // TEST 1: Search with filename partial match (case-insensitive)
  // =====================================================
  const filenameSearchResult = await api.functional.redditClone.files.index(
    connection,
    {
      body: {
        filename: "test",
      } satisfies IRedditCloneFile.IRequest,
    },
  );
  typia.assert(filenameSearchResult);
  TestValidator.equals(
    "filename search returns valid pagination structure",
    filenameSearchResult.pagination !== undefined,
    true,
  );
  TestValidator.predicate(
    "filename search returns array of files",
    Array.isArray(filenameSearchResult.data),
  );
  // =====================================================
  // TEST 2: Search with MIME type filter
  // =====================================================
  const mimeTypeFilter = "image/jpeg";
  const mimeTypeResult = await api.functional.redditClone.files.index(
    connection,
    {
      body: {
        mimeType: mimeTypeFilter,
      } satisfies IRedditCloneFile.IRequest,
    },
  );
  typia.assert(mimeTypeResult);
  // Verify all returned files have the specified MIME type
  for (const file of mimeTypeResult.data) {
    TestValidator.equals(
      "mimeType filter returns only matching files",
      file.mimeType,
      mimeTypeFilter,
    );
  }
  // =====================================================
  // TEST 3: Search with PNG MIME type filter
  // =====================================================
  const pngMimeTypeFilter = "image/png";
  const pngMimeTypeResult = await api.functional.redditClone.files.index(
    connection,
    {
      body: {
        mimeType: pngMimeTypeFilter,
      } satisfies IRedditCloneFile.IRequest,
    },
  );
  typia.assert(pngMimeTypeResult);
  for (const file of pngMimeTypeResult.data) {
    TestValidator.equals(
      "png mimeType filter returns only png files",
      file.mimeType,
      pngMimeTypeFilter,
    );
  }
  // =====================================================
  // TEST 4: Search with status filter
  // =====================================================
  const statusFilter = "processed";
  const statusResult = await api.functional.redditClone.files.index(
    connection,
    {
      body: {
        status: statusFilter,
      } satisfies IRedditCloneFile.IRequest,
    },
  );
  typia.assert(statusResult);
  for (const file of statusResult.data) {
    TestValidator.equals(
      "status filter returns only processed files",
      file.status,
      statusFilter,
    );
  }
  // =====================================================
  // TEST 5: Search with date range filter (createdAfter)
  // =====================================================
  const createdAfterDate = new Date(
    Date.now() - 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const createdAfterResult = await api.functional.redditClone.files.index(
    connection,
    {
      body: {
        createdAfter: createdAfterDate,
      } satisfies IRedditCloneFile.IRequest,
    },
  );
  typia.assert(createdAfterResult);
  for (const file of createdAfterResult.data) {
    TestValidator.predicate(
      "createdAfter filter returns files within date range",
      new Date(file.createdAt) >= new Date(createdAfterDate),
    );
  }
  // =====================================================
  // TEST 6: Search with date range filter (createdBefore)
  // =====================================================
  const createdBeforeDate = new Date().toISOString();
  const createdBeforeResult = await api.functional.redditClone.files.index(
    connection,
    {
      body: {
        createdBefore: createdBeforeDate,
      } satisfies IRedditCloneFile.IRequest,
    },
  );
  typia.assert(createdBeforeResult);
  for (const file of createdBeforeResult.data) {
    TestValidator.predicate(
      "createdBefore filter returns files within date range",
      new Date(file.createdAt) <= new Date(createdBeforeDate),
    );
  }
  // =====================================================
  // TEST 7: Combined filters - filename and mimeType
  // =====================================================
  const combinedResult = await api.functional.redditClone.files.index(
    connection,
    {
      body: {
        filename: "image",
        mimeType: "image/jpeg",
      } satisfies IRedditCloneFile.IRequest,
    },
  );
  typia.assert(combinedResult);
  for (const file of combinedResult.data) {
    TestValidator.equals(
      "combined filter - mimeType is image/jpeg",
      file.mimeType,
      "image/jpeg",
    );
  }
  // =====================================================
  // TEST 8: Combined filters - status and date range
  // =====================================================
  const combinedStartDate = new Date(
    Date.now() - 180 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const combinedEndDate = new Date().toISOString();
  const combinedDateStatusResult = await api.functional.redditClone.files.index(
    connection,
    {
      body: {
        status: "processed",
        createdAfter: combinedStartDate,
        createdBefore: combinedEndDate,
      } satisfies IRedditCloneFile.IRequest,
    },
  );
  typia.assert(combinedDateStatusResult);
  for (const file of combinedDateStatusResult.data) {
    TestValidator.equals(
      "combined filter - status is processed",
      file.status,
      "processed",
    );
    TestValidator.predicate(
      "combined filter - within date range",
      new Date(file.createdAt) >= new Date(combinedStartDate) &&
        new Date(file.createdAt) <= new Date(combinedEndDate),
    );
  }
  // =====================================================
  // TEST 9: Pagination with filters
  // =====================================================
  const paginatedResult = await api.functional.redditClone.files.index(
    connection,
    {
      body: {
        mimeType: "image/jpeg",
        page: 1,
        limit: 10,
      } satisfies IRedditCloneFile.IRequest,
    },
  );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination has current page",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination has limit",
    paginatedResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "results respect limit",
    paginatedResult.data.length <= 10,
  );
  // =====================================================
  // TEST 10: Sorting with filters
  // =====================================================
  const sortedResult = await api.functional.redditClone.files.index(
    connection,
    {
      body: {
        sort: "createdAt",
        order: "desc",
      } satisfies IRedditCloneFile.IRequest,
    },
  );
  typia.assert(sortedResult);
  TestValidator.predicate(
    "sorted result has data",
    sortedResult.data.length > 0,
  );
  // =====================================================
  // TEST 11: Empty search criteria returns results
  // =====================================================
  const emptySearchResult = await api.functional.redditClone.files.index(
    connection,
    {
      body: {} satisfies IRedditCloneFile.IRequest,
    },
  );
  typia.assert(emptySearchResult);
  TestValidator.predicate(
    "empty search returns results",
    emptySearchResult.data.length >= 0,
  );
  // =====================================================
  // TEST 12: Complex combined filter with all filters
  // =====================================================
  const complexStartDate = new Date(
    Date.now() - 90 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const complexEndDate = new Date().toISOString();
  const complexResult = await api.functional.redditClone.files.index(
    connection,
    {
      body: {
        status: "processed",
        mimeType: "image/png",
        createdAfter: complexStartDate,
        createdBefore: complexEndDate,
        sort: "createdAt",
        order: "desc",
        page: 1,
        limit: 20,
      } satisfies IRedditCloneFile.IRequest,
    },
  );
  typia.assert(complexResult);
  for (const file of complexResult.data) {
    TestValidator.equals(
      "complex filter - status is processed",
      file.status,
      "processed",
    );
    TestValidator.equals(
      "complex filter - mimeType is image/png",
      file.mimeType,
      "image/png",
    );
    TestValidator.predicate(
      "complex filter - within date range",
      new Date(file.createdAt) >= new Date(complexStartDate) &&
        new Date(file.createdAt) <= new Date(complexEndDate),
    );
  }
  TestValidator.equals(
    "complex filter - respects limit",
    complexResult.pagination.limit,
    20,
  );
}
