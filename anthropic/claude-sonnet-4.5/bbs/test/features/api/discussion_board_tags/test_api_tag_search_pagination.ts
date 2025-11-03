import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTag";

export async function test_api_tag_search_pagination(
  connection: api.IConnection,
) {
  // Test pagination with default parameters to get baseline
  const initialPage = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {} satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(initialPage);

  const totalRecords = initialPage.pagination.records;

  // Test with specific page size
  const pageSize = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const firstPage = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        limit: pageSize,
        page: 1,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(firstPage);

  // Validate pagination metadata for first page
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals(
    "first page limit",
    firstPage.pagination.limit,
    pageSize,
  );
  TestValidator.equals(
    "total records consistency",
    firstPage.pagination.records,
    totalRecords,
  );

  // Verify page count calculation
  const expectedPages = Math.ceil(totalRecords / pageSize);
  TestValidator.equals(
    "total pages calculation",
    firstPage.pagination.pages,
    expectedPages,
  );

  // Verify data array length
  if (totalRecords > 0) {
    const expectedDataLength = Math.min(pageSize, totalRecords);
    TestValidator.equals(
      "first page data length",
      firstPage.data.length,
      expectedDataLength,
    );
  }

  // Test navigating to second page if available
  if (firstPage.pagination.pages > 1) {
    const secondPage = await api.functional.discussionBoard.tags.index(
      connection,
      {
        body: {
          limit: pageSize,
          page: 2,
        } satisfies IDiscussionBoardTag.IRequest,
      },
    );
    typia.assert(secondPage);

    TestValidator.equals(
      "second page current",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals(
      "second page limit",
      secondPage.pagination.limit,
      pageSize,
    );
    TestValidator.equals(
      "second page total records",
      secondPage.pagination.records,
      totalRecords,
    );
    TestValidator.equals(
      "second page total pages",
      secondPage.pagination.pages,
      expectedPages,
    );

    // Verify data length for second page
    const remainingRecords = totalRecords - pageSize;
    const expectedSecondPageLength = Math.min(pageSize, remainingRecords);
    TestValidator.equals(
      "second page data length",
      secondPage.data.length,
      expectedSecondPageLength,
    );
  }

  // Test different page sizes
  const smallPageSize = 5;
  const smallPageResult = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        limit: smallPageSize,
        page: 1,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(smallPageResult);

  TestValidator.equals(
    "small page size limit",
    smallPageResult.pagination.limit,
    smallPageSize,
  );
  const expectedSmallPages = Math.ceil(totalRecords / smallPageSize);
  TestValidator.equals(
    "small page size total pages",
    smallPageResult.pagination.pages,
    expectedSmallPages,
  );

  const largePageSize = 50;
  const largePageResult = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        limit: largePageSize,
        page: 1,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(largePageResult);

  TestValidator.equals(
    "large page size limit",
    largePageResult.pagination.limit,
    largePageSize,
  );
  const expectedLargePages = Math.ceil(totalRecords / largePageSize);
  TestValidator.equals(
    "large page size total pages",
    largePageResult.pagination.pages,
    expectedLargePages,
  );

  // Test edge case: requesting page beyond available data
  if (totalRecords > 0) {
    const beyondPage = firstPage.pagination.pages + 10;
    const beyondPageResult = await api.functional.discussionBoard.tags.index(
      connection,
      {
        body: {
          limit: pageSize,
          page: beyondPage,
        } satisfies IDiscussionBoardTag.IRequest,
      },
    );
    typia.assert(beyondPageResult);

    // Should return empty data for pages beyond total
    TestValidator.equals(
      "beyond page data empty",
      beyondPageResult.data.length,
      0,
    );
    TestValidator.equals(
      "beyond page current",
      beyondPageResult.pagination.current,
      beyondPage,
    );
  }

  // Test consistency: verify total records remains the same across different requests
  const consistencyCheck = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(consistencyCheck);

  TestValidator.equals(
    "total records consistency check",
    consistencyCheck.pagination.records,
    totalRecords,
  );
}
