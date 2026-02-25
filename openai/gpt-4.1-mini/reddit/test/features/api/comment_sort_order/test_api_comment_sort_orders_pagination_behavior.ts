import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommentSortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSortOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentSortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentSortOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_comment_sort_orders_pagination_behavior(
  connection: api.IConnection,
): Promise<void> {
  // Create a base connection to clone for queries
  const baseConnection: api.IConnection = { host: connection.host };
  // Query first page with limit=2
  const firstPageBody: ICommunityPlatformCommentSortOrder.IRequest = {
    page: 1,
    limit: 2,
  };
  const firstPageResponse =
    await api.functional.communityPlatform.commentSortOrders.index(
      baseConnection,
      { body: firstPageBody },
    );
  typia.assert(firstPageResponse);
  // Validate pagination metadata for first page
  TestValidator.equals(
    "pagination current page should be 1",
    firstPageResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 2",
    firstPageResponse.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "total records should be 0 or more",
    firstPageResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be 0 or more",
    firstPageResponse.pagination.pages >= 0,
  );
  // If no data, validate empty data and no errors for pages 2 and 3
  if (firstPageResponse.pagination.records === 0) {
    TestValidator.equals(
      "data array should be empty when no records",
      firstPageResponse.data.length,
      0,
    );
    // Query page 2 with same limit
    const secondPageBody: ICommunityPlatformCommentSortOrder.IRequest = {
      page: 2,
      limit: 2,
    };
    const secondPageResponse =
      await api.functional.communityPlatform.commentSortOrders.index(
        baseConnection,
        { body: secondPageBody },
      );
    typia.assert(secondPageResponse);
    TestValidator.equals(
      "empty data on page 2 when no records",
      secondPageResponse.data.length,
      0,
    );
    // Query page 3 with same limit (beyond total pages)
    const thirdPageBody: ICommunityPlatformCommentSortOrder.IRequest = {
      page: 3,
      limit: 2,
    };
    const thirdPageResponse =
      await api.functional.communityPlatform.commentSortOrders.index(
        baseConnection,
        { body: thirdPageBody },
      );
    typia.assert(thirdPageResponse);
    TestValidator.equals(
      "empty data on page 3 beyond total pages",
      thirdPageResponse.data.length,
      0,
    );
    return;
  }
  // When records exist, validate pagination counts and data subsets
  const totalPages = firstPageResponse.pagination.pages;
  const totalRecords = firstPageResponse.pagination.records;
  // Validate page count consistency
  TestValidator.predicate(
    "total pages must not be less than current page",
    totalPages >= 1 && totalPages >= firstPageResponse.pagination.current,
  );
  // Validate that first page data length is appropriate
  TestValidator.predicate(
    "first page data length should be between 1 and limit",
    firstPageResponse.data.length > 0 &&
      firstPageResponse.data.length <= firstPageBody.limit!,
  );
  // Collect all page data for cross-page validation
  const allPagesData: ICommunityPlatformCommentSortOrder.ISummary[] = [
    ...firstPageResponse.data,
  ];
  // Iterate through pages 2 to totalPages
  for (let page = 2; page <= totalPages; ++page) {
    const pageBody: ICommunityPlatformCommentSortOrder.IRequest = {
      page: page,
      limit: 2,
    };
    const pageResponse =
      await api.functional.communityPlatform.commentSortOrders.index(
        baseConnection,
        { body: pageBody },
      );
    typia.assert(pageResponse);
    // Validate page metadata
    TestValidator.equals(
      `pagination current page should be ${page}`,
      pageResponse.pagination.current,
      page,
    );
    TestValidator.equals(
      "pagination limit should be 2",
      pageResponse.pagination.limit,
      2,
    );
    TestValidator.equals(
      "pagination total records should match first page",
      pageResponse.pagination.records,
      totalRecords,
    );
    TestValidator.equals(
      "pagination total pages should match first page",
      pageResponse.pagination.pages,
      totalPages,
    );
    // Validate data length boundaries
    TestValidator.predicate(
      `page ${page} data length should be between 0 and limit`,
      pageResponse.data.length >= 0 && pageResponse.data.length <= 2,
    );
    // Collect page data
    allPagesData.push(...pageResponse.data);
  }
  // Validate total collected data length matches total records
  TestValidator.equals(
    "total collected data length should match total records",
    allPagesData.length,
    totalRecords,
  );
  // Query a page beyond totalPages, e.g., totalPages + 1
  const beyondPageBody: ICommunityPlatformCommentSortOrder.IRequest = {
    page: totalPages + 1,
    limit: 2,
  };
  const beyondPageResponse =
    await api.functional.communityPlatform.commentSortOrders.index(
      baseConnection,
      { body: beyondPageBody },
    );
  typia.assert(beyondPageResponse);
  // Validate empty data for page beyond total pages
  TestValidator.equals(
    "empty data on page beyond total pages",
    beyondPageResponse.data.length,
    0,
  );
  TestValidator.equals(
    "pagination current page should reflect requested page",
    beyondPageResponse.pagination.current,
    beyondPageBody.page!,
  );
  TestValidator.equals(
    "pagination limit should match requested limit",
    beyondPageResponse.pagination.limit,
    beyondPageBody.limit!,
  );
}
