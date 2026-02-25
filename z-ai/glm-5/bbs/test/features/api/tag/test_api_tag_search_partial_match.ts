import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test tag search functionality with partial value matching.
 *
 * Validates case-insensitive partial matching, pagination with search filter,
 * and correct filtering behavior for tag search operations.
 */
export async function test_api_tag_search_partial_match(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Partial matching - search with a partial term
  const partialMatchResult = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        search: "pol",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(partialMatchResult);
  // Validate partial match: all returned tags should contain 'pol' (case-insensitive)
  for (const tag of partialMatchResult.data) {
    TestValidator.predicate(
      `tag '${tag.value}' contains 'pol'`,
      tag.value.toLowerCase().includes("pol"),
    );
  }
  // Test 2: Case-insensitivity - search with different case variations
  const searchTerms = ["politic", "POLITIC", "Politic", "PoLiTiC"];
  const caseResults: IPageIDiscussionBoardTag.ISummary[] = [];
  for (const term of searchTerms) {
    const result = await api.functional.discussionBoard.tags.index(connection, {
      body: {
        search: term,
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardTag.IRequest,
    });
    typia.assert(result);
    caseResults.push(result);
  }
  // All case variations should return the same tags (by ID)
  const firstResultIds = new Set(caseResults[0].data.map((t) => t.id));
  for (let i = 1; i < caseResults.length; i++) {
    const currentIds = new Set(caseResults[i].data.map((t) => t.id));
    TestValidator.equals(
      `case-insensitive search results match for '${searchTerms[i]}'`,
      [...currentIds].sort(),
      [...firstResultIds].sort(),
    );
  }
  // Test 3: Non-matching search returns empty or filtered results
  const nonMatchingResult = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        search: "xyznonexistent123",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(nonMatchingResult);
  TestValidator.equals(
    "non-matching search returns empty data",
    nonMatchingResult.data.length,
    0,
  );
  // Test 4: Pagination metadata reflects filtered results
  const paginatedResult = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        search: "pol",
        page: 1,
        limit: 3,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination limit respected",
    paginatedResult.data.length <= 3,
  );
  TestValidator.predicate(
    "pagination current page is 1",
    paginatedResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit matches request",
    paginatedResult.pagination.limit === 3,
  );
  // Test 5: No search parameter returns all tags
  const allTagsResult = await api.functional.discussionBoard.tags.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardTag.IRequest,
    },
  );
  typia.assert(allTagsResult);
  // All tags result should have more or equal records than filtered result
  TestValidator.predicate(
    "all tags count >= filtered count",
    allTagsResult.pagination.records >= partialMatchResult.pagination.records,
  );
}
