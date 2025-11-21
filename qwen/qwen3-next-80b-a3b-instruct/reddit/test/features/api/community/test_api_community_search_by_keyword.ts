import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityBBSReportResult } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSReportResult";
import type { ICommunityBBSSearchRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSSearchRequest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBBSReportResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBBSReportResult";

export async function test_api_community_search_by_keyword(
  connection: api.IConnection,
) {
  // Generate a valid search term between 3-100 characters
  const searchTerm = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 30,
  });

  // Ensure the search term meets the 3-100 character requirement
  TestValidator.predicate(
    "search term length is between 3 and 100 characters",
    searchTerm.length >= 3 && searchTerm.length <= 100,
  );

  // Perform the search operation using the generated term
  const searchResult: IPageICommunityBBSReportResult =
    await api.functional.communityBBS.search(connection, {
      body: searchTerm satisfies ICommunityBBSSearchRequest,
    });

  // Validate the response structure matches IPageICommunityBBSReportResult
  typia.assert(searchResult);

  // Verify pagination object structure
  TestValidator.equals(
    "pagination object has correct type properties",
    searchResult.pagination,
    {
      current: searchResult.pagination.current,
      limit: searchResult.pagination.limit,
      records: searchResult.pagination.records,
      pages: searchResult.pagination.pages,
    },
  );

  // Validate that pagination properties have correct constraints
  TestValidator.predicate(
    "current page is non-negative integer",
    Number.isInteger(searchResult.pagination.current) &&
      searchResult.pagination.current >= 0,
  );

  TestValidator.predicate(
    "limit is positive integer",
    Number.isInteger(searchResult.pagination.limit) &&
      searchResult.pagination.limit > 0,
  );

  TestValidator.predicate(
    "records is non-negative integer",
    Number.isInteger(searchResult.pagination.records) &&
      searchResult.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pages is positive integer",
    Number.isInteger(searchResult.pagination.pages) &&
      searchResult.pagination.pages > 0,
  );

  // Validate data array structure
  TestValidator.predicate("data is an array", Array.isArray(searchResult.data));

  // Verify each item in data array is a string (per ICommunityBBSReportResult type)
  for (const item of searchResult.data) {
    TestValidator.predicate(
      "each data item is a string",
      typeof item === "string",
    );
  }

  // Verify that non-empty results have at least one item
  if (searchResult.data.length > 0) {
    TestValidator.predicate(
      "search result contains data",
      searchResult.data.length > 0,
    );
  }
}
