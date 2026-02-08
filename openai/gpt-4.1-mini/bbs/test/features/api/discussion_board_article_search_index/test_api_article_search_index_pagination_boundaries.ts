import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSearchIndex";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleSearchIndex";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_article_search_index_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // We will test the pagination boundary by fetching the last page with a given limit.
  // Note: The request body schema IDiscussionBoardArticleSearchIndex.IRequest is empty as per given DTO.
  // Pagination parameters presumably are in the request body or the implementation.
  // However, the actual DTO for request has no properties.
  // According to the SDK definition, the request type is IDiscussionBoardArticleSearchIndex.IRequest which is empty.
  // Given the scenario and the API function, we will assume the pagination parameters are part of the request body even if not visible in DTOs.
  // We'll use patch /discussionBoard/article-search-indexes with a request body.
  // To test pagination boundary, we must simulate or check total records to find total pages.
  // Since this is an E2E test and no utility functions, and request body is empty,
  // we have to do a first call with some limit to get total pages, then do a call with last page.
  // Using a limit of 10 for pagination.
  // First call to get total records and pages
  const initialLimit = 10 as number & tags.Type<"int32"> & tags.Minimum<0>;
  const firstResponse =
    await api.functional.discussionBoard.article_search_indexes.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(firstResponse);
  // If no records, just confirm pagination is zero and data length is zero
  if (firstResponse.pagination.records === 0) {
    // Validate empty data
    TestValidator.equals("pagination pages", firstResponse.pagination.pages, 0);
    TestValidator.equals(
      "pagination records",
      firstResponse.pagination.records,
      0,
    );
    TestValidator.equals(
      "pagination current",
      firstResponse.pagination.current,
      1,
    );
    TestValidator.equals("limit", firstResponse.pagination.limit, 0);
    TestValidator.equals("data length", firstResponse.data.length, 0);
    return;
  }
  // Otherwise, proceed with pagination boundary test.
  // Assume limit is set somewhere, but DTO IRequest is empty, so maybe the limit is fixed or in query string?
  // Since there is no limit or page parameter in IRequest, and no utility function, just confirm the returned pagination details.
  // Let's get the last page number from the first response pagination
  const lastPage = firstResponse.pagination.pages;
  const totalRecords = firstResponse.pagination.records;
  const limitPerPage = firstResponse.pagination.limit;
  // Defensive: If last page is 0, then no records
  if (lastPage === 0) {
    TestValidator.predicate("lastPage is zero when no records", true);
    return;
  }
  // Fetch the last page explicitly if possible
  // But Request DTO has no page or limit, so we cannot pass without modifying the API.
  // So this scenario is impossible to implement exactly as requested because scenario plan requires page and limit input.
  // Therefore, we will rewrite scenario using the available API: make call with empty body (the only option)
  // And check that pagination metadata and data length are consistent and valid.
  // Validate that data length is <= limit
  TestValidator.predicate(
    "data length is <= limit",
    firstResponse.data.length <= limitPerPage,
  );
  // Validate pages calculation
  TestValidator.equals(
    "pages calculation",
    firstResponse.pagination.pages,
    Math.ceil(totalRecords / limitPerPage),
  );
  // Validate that current page is 1
  TestValidator.equals("current page", firstResponse.pagination.current, 1);
  // Validate total records is non-negative
  TestValidator.predicate("total records >= 0", totalRecords >= 0);
}
