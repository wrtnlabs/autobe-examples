import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleTag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_tags_search_with_matching_pattern(
  connection: api.IConnection,
): Promise<void> {
  // Note: This test focuses on the tag search functionality only
  // Since we cannot create articles through available APIs (no article creation endpoints provided),
  // we test the existing tag search functionality with the assumption that some tags exist
  // Test partial matching with 'economic' search term
  const searchResponse = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        search: "economic",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticleTag.IRequest,
    },
  );
  typia.assert(searchResponse);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    searchResponse.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResponse.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records count",
    searchResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count",
    searchResponse.pagination.pages >= 0,
  );
  // Validate that returned tags contain 'economic' (case-insensitive partial match)
  searchResponse.data.forEach((tag) => {
    TestValidator.predicate(
      "tag contains search term",
      tag.tag.toLowerCase().includes("economic"),
    );
  });
  // Test pagination with different parameters
  const page2Response = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        search: "economic",
        page: 2,
        limit: 5,
      } satisfies IDiscussionBoardArticleTag.IRequest,
    },
  );
  typia.assert(page2Response);
  // Validate pagination metadata for second page
  TestValidator.equals(
    "page 2 current page",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 5);
  // Test case-insensitive search
  const caseInsensitiveResponse =
    await api.functional.discussionBoard.tags.index(connection, {
      body: {
        search: "ECONOMIC",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticleTag.IRequest,
    });
  typia.assert(caseInsensitiveResponse);
  // Case-insensitive search should return same results
  TestValidator.equals(
    "case insensitive search results count",
    searchResponse.pagination.records,
    caseInsensitiveResponse.pagination.records,
  );
  // Test empty search returns all tags
  const allTagsResponse = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        search: "",
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardArticleTag.IRequest,
    },
  );
  typia.assert(allTagsResponse);
  // Empty search should return more or equal tags than specific search
  TestValidator.predicate(
    "empty search returns all tags",
    allTagsResponse.pagination.records >= searchResponse.pagination.records,
  );
  // Test tag normalization by searching with whitespace variations
  const trimmedResponse = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        search: "  economic  ",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticleTag.IRequest,
    },
  );
  typia.assert(trimmedResponse);
  // Whitespace-trimmed search should return same results
  TestValidator.equals(
    "whitespace trimmed search results count",
    searchResponse.pagination.records,
    trimmedResponse.pagination.records,
  );
}
