import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchResult";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSearchResult";

/**
 * Test search behavior when query returns no matching results.
 *
 * Performs searches with keywords that do not match any article or comment
 * content in the system. Verifies that search returns empty data arrays for
 * both articles and comments when no matches are found. Validates that
 * pagination metadata correctly reflects zero total records and zero total
 * pages when no results match. Tests combining multiple filters (keyword +
 * category + date range) where the combination yields no results. Verifies that
 * response structure is valid even with empty results - should include
 * pagination object and proper data arrays, not null values.
 */
export async function test_api_search_empty_results(
  connection: api.IConnection,
) {
  // 1. Create member account for searching
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(10),
        display_name: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Test search with non-matching keyword only
  const nonMatchingKeyword = RandomGenerator.alphaNumeric(20);
  const emptySearchResult: IPageIDiscussionBoardSearchResult =
    await api.functional.discussionBoard.search.index(connection, {
      body: {
        q: nonMatchingKeyword,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(emptySearchResult);

  // Verify pagination shows zero records
  TestValidator.equals(
    "pagination shows zero total records",
    emptySearchResult.pagination.records,
    0,
  );

  // Verify pagination shows zero pages
  TestValidator.equals(
    "pagination shows zero total pages",
    emptySearchResult.pagination.pages,
    0,
  );

  // Verify data array exists and is empty
  TestValidator.equals(
    "search returns empty data array",
    emptySearchResult.data.length,
    0,
  );

  // Verify response structure has valid pagination object
  TestValidator.predicate(
    "pagination object is not null",
    emptySearchResult.pagination !== null,
  );

  // 3. Test search with sort parameter on empty results
  const emptySearchWithSort: IPageIDiscussionBoardSearchResult =
    await api.functional.discussionBoard.search.index(connection, {
      body: {
        q: RandomGenerator.alphaNumeric(18),
        sort_by: "newest",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(emptySearchWithSort);

  TestValidator.equals(
    "sorted empty search returns zero results",
    emptySearchWithSort.pagination.records,
    0,
  );
  TestValidator.equals(
    "sorted empty search has zero pages",
    emptySearchWithSort.pagination.pages,
    0,
  );
  TestValidator.equals(
    "sorted empty search data is empty",
    emptySearchWithSort.data.length,
    0,
  );

  // 4. Test search with date range filter yielding no results
  const pastDate = new Date(
    Date.now() - 730 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const farPastDate = new Date(
    Date.now() - 1095 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const filteredEmptySearch: IPageIDiscussionBoardSearchResult =
    await api.functional.discussionBoard.search.index(connection, {
      body: {
        q: RandomGenerator.alphaNumeric(15),
        date_from: farPastDate satisfies string as string &
          tags.Format<"date-time">,
        date_to: pastDate satisfies string as string & tags.Format<"date-time">,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(filteredEmptySearch);

  // Verify pagination metadata for filtered empty results
  TestValidator.equals(
    "filtered empty search returns zero records",
    filteredEmptySearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "filtered empty search returns zero pages",
    filteredEmptySearch.pagination.pages,
    0,
  );

  // 5. Test with pagination parameters on empty search
  const paginatedEmptySearch: IPageIDiscussionBoardSearchResult =
    await api.functional.discussionBoard.search.index(connection, {
      body: {
        q: RandomGenerator.alphaNumeric(25),
        page: 1 satisfies number as number &
          tags.Type<"int32"> &
          tags.Minimum<1>,
        limit: 20 satisfies number as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(paginatedEmptySearch);

  // Verify pagination is consistent
  TestValidator.equals(
    "page parameter is respected on empty results",
    paginatedEmptySearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit parameter is respected on empty results",
    paginatedEmptySearch.pagination.limit,
    20,
  );
  TestValidator.equals(
    "empty search with pagination returns zero records",
    paginatedEmptySearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search with pagination returns zero pages",
    paginatedEmptySearch.pagination.pages,
    0,
  );

  // 6. Test search with comments disabled filter
  const emptySearchNoComments: IPageIDiscussionBoardSearchResult =
    await api.functional.discussionBoard.search.index(connection, {
      body: {
        q: RandomGenerator.alphaNumeric(20),
        include_comments: false,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(emptySearchNoComments);

  // Verify structure is valid even with empty results
  TestValidator.predicate(
    "empty search structure has valid pagination",
    emptySearchNoComments.pagination.current >= 0,
  );
  TestValidator.predicate(
    "empty search data is array not null",
    Array.isArray(emptySearchNoComments.data),
  );
  TestValidator.equals(
    "empty search returns zero data items",
    emptySearchNoComments.data.length,
    0,
  );
}
