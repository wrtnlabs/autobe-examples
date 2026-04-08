import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneFile";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_files_search_and_date_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Fetch all files to get baseline data and understand available files
  const allFilesResult = await api.functional.redditClone.files.index(
    connection,
    {
      body: {
        limit: 100,
      } satisfies IRedditCloneFile.IRequest,
    },
  );
  typia.assert(allFilesResult);
  TestValidator.equals(
    "should have pagination",
    allFilesResult.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "should have data array",
    Array.isArray(allFilesResult.data),
    true,
  );
  // 2. Test search parameter - case-insensitive partial matching
  // Try searching for common terms like "avatar" or "image" in filenames
  const searchTerm = "avatar";
  const searchResult = await api.functional.redditClone.files.index(
    connection,
    {
      body: {
        search: searchTerm,
        limit: 50,
      } satisfies IRedditCloneFile.IRequest,
    },
  );
  typia.assert(searchResult);
  // Validate that all returned files have the search term in their originalFilename
  for (const file of searchResult.data) {
    const hasSearchTerm = file.originalFilename
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    TestValidator.predicate(
      `filename "${file.originalFilename}" should contain search term "${searchTerm}"`,
      hasSearchTerm,
    );
  }
  // 3. Test uploaderId filter - exact UUID match
  if (allFilesResult.data.length > 0) {
    const targetFile = allFilesResult.data[0];
    const uploaderId = targetFile.uploader.id;
    const filteredByUploader = await api.functional.redditClone.files.index(
      connection,
      {
        body: {
          uploaderId: uploaderId,
          limit: 100,
        } satisfies IRedditCloneFile.IRequest,
      },
    );
    typia.assert(filteredByUploader);
    // Validate all files are from the specified uploader
    for (const file of filteredByUploader.data) {
      TestValidator.equals(
        `file should be uploaded by uploader ${uploaderId}`,
        file.uploader.id,
        uploaderId,
      );
    }
  }
  // 4. Test createdAtFrom filter - includes files on or after specified datetime
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneWeekAgoISO = oneWeekAgo.toISOString();
  const fromFilterResult = await api.functional.redditClone.files.index(
    connection,
    {
      body: {
        createdAtFrom: oneWeekAgoISO,
        limit: 100,
      } satisfies IRedditCloneFile.IRequest,
    },
  );
  typia.assert(fromFilterResult);
  // Validate all files are created on or after the specified date
  for (const file of fromFilterResult.data) {
    const fileCreatedAt = new Date(file.createdAt);
    const isOnOrAfter = fileCreatedAt >= oneWeekAgo;
    TestValidator.predicate(
      `file created at ${file.createdAt} should be on or after ${oneWeekAgoISO}`,
      isOnOrAfter,
    );
  }
  // 5. Test createdAtTo filter - includes files on or before specified datetime
  const oneWeekAgoForTo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneWeekAgoToISO = oneWeekAgoForTo.toISOString();
  const toFilterResult = await api.functional.redditClone.files.index(
    connection,
    {
      body: {
        createdAtTo: oneWeekAgoToISO,
        limit: 100,
      } satisfies IRedditCloneFile.IRequest,
    },
  );
  typia.assert(toFilterResult);
  // Validate all files are created on or before the specified date
  for (const file of toFilterResult.data) {
    const fileCreatedAt = new Date(file.createdAt);
    const isOnOrBefore = fileCreatedAt <= oneWeekAgoForTo;
    TestValidator.predicate(
      `file created at ${file.createdAt} should be on or before ${oneWeekAgoToISO}`,
      isOnOrBefore,
    );
  }
  // 6. Test combined date range filter (from AND to)
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const oneWeekAgoForRange = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgoISO = oneMonthAgo.toISOString();
  const weekAgoISO = oneWeekAgoForRange.toISOString();
  const rangeFilterResult = await api.functional.redditClone.files.index(
    connection,
    {
      body: {
        createdAtFrom: monthAgoISO,
        createdAtTo: weekAgoISO,
        limit: 100,
      } satisfies IRedditCloneFile.IRequest,
    },
  );
  typia.assert(rangeFilterResult);
  // Validate all files are within the date range (inclusive)
  for (const file of rangeFilterResult.data) {
    const fileCreatedAt = new Date(file.createdAt);
    const isInRange =
      fileCreatedAt >= oneMonthAgo && fileCreatedAt <= oneWeekAgoForRange;
    TestValidator.predicate(
      `file created at ${file.createdAt} should be within range ${monthAgoISO} to ${weekAgoISO}`,
      isInRange,
    );
  }
  // 7. Test combining search with date range
  const combinedSearchAndDateResult =
    await api.functional.redditClone.files.index(connection, {
      body: {
        search: "avatar",
        createdAtFrom: monthAgoISO,
        createdAtTo: weekAgoISO,
        limit: 100,
      } satisfies IRedditCloneFile.IRequest,
    });
  typia.assert(combinedSearchAndDateResult);
  // Validate all files match both search term AND date range
  for (const file of combinedSearchAndDateResult.data) {
    const hasSearchTerm = file.originalFilename
      .toLowerCase()
      .includes("avatar");
    TestValidator.predicate(
      `filename "${file.originalFilename}" should contain search term "avatar"`,
      hasSearchTerm,
    );
    const fileCreatedAt = new Date(file.createdAt);
    const isInRange =
      fileCreatedAt >= oneMonthAgo && fileCreatedAt <= oneWeekAgoForRange;
    TestValidator.predicate(
      `file created at ${file.createdAt} should be within range ${monthAgoISO} to ${weekAgoISO}`,
      isInRange,
    );
  }
  // 8. Validate results are sorted by created_at descending
  const sortTestResult = await api.functional.redditClone.files.index(
    connection,
    {
      body: {
        limit: 50,
      } satisfies IRedditCloneFile.IRequest,
    },
  );
  typia.assert(sortTestResult);
  if (sortTestResult.data.length > 1) {
    for (let i = 0; i < sortTestResult.data.length - 1; i++) {
      const currentFile = sortTestResult.data[i];
      const nextFile = sortTestResult.data[i + 1];
      const currentDate = new Date(currentFile.createdAt);
      const nextDate = new Date(nextFile.createdAt);
      TestValidator.predicate(
        `file at index ${i} (${currentFile.createdAt}) should have created_at >= file at index ${i + 1} (${nextFile.createdAt})`,
        currentDate >= nextDate,
      );
    }
  }
  // 9. Test pagination parameters work correctly with filters
  const paginatedResult = await api.functional.redditClone.files.index(
    connection,
    {
      body: {
        search: "avatar",
        page: 1,
        limit: 5,
      } satisfies IRedditCloneFile.IRequest,
    },
  );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination should exist",
    paginatedResult.pagination !== undefined,
    true,
  );
  TestValidator.predicate(
    "data length should be at most limit",
    paginatedResult.data.length <= 5,
  );
}
