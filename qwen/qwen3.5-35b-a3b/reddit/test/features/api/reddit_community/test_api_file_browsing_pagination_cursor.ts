import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityFile";
import type { IRedditCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_file_browsing_pagination_cursor(
  connection: api.IConnection,
): Promise<void> {
  // 1. Initial request with page_size=5 to get first page
  const initialConnection: api.IConnection = { host: connection.host };
  const firstPageResponse = await api.functional.redditCommunity.files.index(
    initialConnection,
    {
      body: {
        page_size: 5,
      } satisfies IRedditCommunityFile.IRequest,
    },
  );
  typia.assert(firstPageResponse);
  // 2. Verify pagination metadata for first page
  TestValidator.equals(
    "first page current",
    firstPageResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit",
    firstPageResponse.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "first page records positive",
    firstPageResponse.pagination.records > 0,
  );
  TestValidator.predicate(
    "first page pages positive",
    firstPageResponse.pagination.pages > 0,
  );
  // 3. Make second request using page parameter to simulate pagination
  const secondPageResponse = await api.functional.redditCommunity.files.index(
    initialConnection,
    {
      body: {
        page_size: 5,
        page: 2,
      } satisfies IRedditCommunityFile.IRequest,
    },
  );
  typia.assert(secondPageResponse);
  // 4. Verify no duplicates between pages
  const firstPageIds = new Set(firstPageResponse.data.map((file) => file.id));
  const secondPageIds = new Set(secondPageResponse.data.map((file) => file.id));
  const duplicateIds = Array.from(firstPageIds).filter((id) =>
    secondPageIds.has(id),
  );
  TestValidator.equals(
    "no duplicate IDs between pages",
    duplicateIds.length,
    0,
  );
  // 5. Validate second page number
  TestValidator.equals(
    "second page current",
    secondPageResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page limit",
    secondPageResponse.pagination.limit,
    5,
  );
  // 6. Continue paging through all pages until we reach last page
  const totalRecords = firstPageResponse.pagination.records;
  const totalPageCount = firstPageResponse.pagination.pages;
  const allFiles: IRedditCommunityFile.ISummary[] = [
    ...firstPageResponse.data,
    ...secondPageResponse.data,
  ];
  let currentPage = 2;
  while (currentPage < totalPageCount) {
    currentPage += 1;
    const nextPageResponse = await api.functional.redditCommunity.files.index(
      initialConnection,
      {
        body: {
          page_size: 5,
          page: currentPage,
        } satisfies IRedditCommunityFile.IRequest,
      },
    );
    typia.assert(nextPageResponse);
    // Validate page number increments correctly
    TestValidator.equals(
      `page ${currentPage} current`,
      nextPageResponse.pagination.current,
      currentPage,
    );
    TestValidator.equals(
      `page ${currentPage} limit`,
      nextPageResponse.pagination.limit,
      5,
    );
    // Verify no duplicates with previous pages
    const previousIds = new Set(allFiles.map((file) => file.id));
    const nextPageIds = new Set(nextPageResponse.data.map((file) => file.id));
    const duplicateCount = Array.from(previousIds).filter((id) =>
      nextPageIds.has(id),
    ).length;
    TestValidator.equals(
      `page ${currentPage} no duplicates`,
      duplicateCount,
      0,
    );
    allFiles.push(...nextPageResponse.data);
  }
  // 7. Validate total records count matches sum of all files retrieved
  const retrievedCount = allFiles.length;
  TestValidator.equals(
    "total records matches retrieved files",
    totalRecords,
    retrievedCount,
  );
  // 8. Test beyond last page (page > total pages returns empty data)
  const beyondLastPage = await api.functional.redditCommunity.files.index(
    initialConnection,
    {
      body: {
        page_size: 5,
        page: totalPageCount + 1,
      } satisfies IRedditCommunityFile.IRequest,
    },
  );
  typia.assert(beyondLastPage);
  TestValidator.equals(
    "beyond last page data is empty",
    beyondLastPage.data.length,
    0,
  );
  TestValidator.equals(
    "beyond last page records",
    beyondLastPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "beyond last page pages",
    beyondLastPage.pagination.pages,
    0,
  );
  // 9. Test switching page_size mid-pagination
  const firstPageWith10 = await api.functional.redditCommunity.files.index(
    initialConnection,
    {
      body: {
        page_size: 10,
      } satisfies IRedditCommunityFile.IRequest,
    },
  );
  typia.assert(firstPageWith10);
  TestValidator.equals(
    "page_size=10 limit",
    firstPageWith10.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "page_size=10 records positive",
    firstPageWith10.pagination.records > 0,
  );
  // Use page=2 with different page_size
  const secondPageWith5 = await api.functional.redditCommunity.files.index(
    initialConnection,
    {
      body: {
        page_size: 5,
        page: 2,
      } satisfies IRedditCommunityFile.IRequest,
    },
  );
  typia.assert(secondPageWith5);
  // Metadata should adjust to new page_size
  TestValidator.equals(
    "page_size switch second page limit",
    secondPageWith5.pagination.limit,
    5,
  );
  // 10. Test cursor-based pagination with filters applied
  const filteredFilesRequest = await api.functional.redditCommunity.files.index(
    initialConnection,
    {
      body: {
        file_type: "user_avatar",
        page_size: 5,
      } satisfies IRedditCommunityFile.IRequest,
    },
  );
  typia.assert(filteredFilesRequest);
  TestValidator.equals(
    "filtered first page current",
    filteredFilesRequest.pagination.current,
    1,
  );
  TestValidator.equals(
    "filtered first page limit",
    filteredFilesRequest.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "filtered pages positive",
    filteredFilesRequest.pagination.pages > 0,
  );
  // Verify all returned files match filter
  for (const file of filteredFilesRequest.data) {
    TestValidator.equals(
      "filtered file matches file_type",
      file.fileType,
      "user_avatar",
    );
  }
  // Continue pagination with filter
  const filteredTotalPageCount = filteredFilesRequest.pagination.pages;
  let filteredCursor = 1;
  const filteredFiles: IRedditCommunityFile.ISummary[] = [
    ...filteredFilesRequest.data,
  ];
  let filteredPage = 1;
  while (filteredPage < filteredTotalPageCount) {
    filteredPage += 1;
    const filteredNextPage = await api.functional.redditCommunity.files.index(
      initialConnection,
      {
        body: {
          file_type: "user_avatar",
          page_size: 5,
          page: filteredPage,
        } satisfies IRedditCommunityFile.IRequest,
      },
    );
    typia.assert(filteredNextPage);
    // Verify all files still match filter
    for (const file of filteredNextPage.data) {
      TestValidator.equals(
        `filtered page ${filteredPage} file matches file_type`,
        file.fileType,
        "user_avatar",
      );
    }
    filteredFiles.push(...filteredNextPage.data);
  }
  // Validate filtered total records matches retrieved count
  TestValidator.equals(
    "filtered total records matches retrieved",
    filteredFilesRequest.pagination.records,
    filteredFiles.length,
  );
  // 11. Test empty result set pagination
  // Request with filter that likely returns no results (very specific MIME type)
  const emptyFilterRequest = await api.functional.redditCommunity.files.index(
    initialConnection,
    {
      body: {
        mime_type: "application/nonexistent_type",
        page_size: 5,
      } satisfies IRedditCommunityFile.IRequest,
    },
  );
  typia.assert(emptyFilterRequest);
  TestValidator.equals(
    "empty result page current",
    emptyFilterRequest.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty result limit",
    emptyFilterRequest.pagination.limit,
    5,
  );
  TestValidator.equals(
    "empty result records",
    emptyFilterRequest.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result pages",
    emptyFilterRequest.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result data is empty",
    emptyFilterRequest.data.length,
    0,
  );
}
