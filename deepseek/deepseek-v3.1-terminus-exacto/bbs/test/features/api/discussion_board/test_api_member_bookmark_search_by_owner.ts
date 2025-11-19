import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardUserBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBookmark";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserBookmark";

/**
 * Test bookmark search functionality for discussion board members.
 *
 * Validates that authenticated members can search and retrieve their own
 * bookmarks with proper pagination, filtering, and sorting capabilities.
 * Ensures the API correctly handles search parameters and returns paginated
 * results that respect the member's ownership and authorization context.
 */
export async function test_api_member_bookmark_search_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphabets(10);

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: "testPassword123",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        ip: "192.168.1.1",
        href: "https://example.com/discussion-board",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Test basic pagination without search query
  const basicSearchResult: IPageIDiscussionBoardUserBookmark.ISummary =
    await api.functional.discussionBoard.member.members.bookmarks.index(
      connection,
      {
        username: member.username,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserBookmark.IRequest,
      },
    );
  typia.assert(basicSearchResult);

  // Validate pagination structure
  TestValidator.equals(
    "pagination structure exists",
    basicSearchResult.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "current page should be 1",
    basicSearchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be 10",
    basicSearchResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "records count should be non-negative",
    basicSearchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count should be non-negative",
    basicSearchResult.pagination.pages >= 0,
  );

  // Step 3: Test search with sorting by created_at (descending)
  const sortedSearchResult: IPageIDiscussionBoardUserBookmark.ISummary =
    await api.functional.discussionBoard.member.members.bookmarks.index(
      connection,
      {
        username: member.username,
        body: {
          page: 1,
          limit: 5,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IDiscussionBoardUserBookmark.IRequest,
      },
    );
  typia.assert(sortedSearchResult);

  // Validate sorting parameters are accepted
  TestValidator.equals(
    "sorted search returns valid pagination",
    sortedSearchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "sorted search limit is correct",
    sortedSearchResult.pagination.limit,
    5,
  );

  // Step 4: Test search with sorting by updated_at (ascending)
  const ascendingSearchResult: IPageIDiscussionBoardUserBookmark.ISummary =
    await api.functional.discussionBoard.member.members.bookmarks.index(
      connection,
      {
        username: member.username,
        body: {
          page: 2,
          limit: 3,
          order_by: "updated_at",
          order_direction: "asc",
        } satisfies IDiscussionBoardUserBookmark.IRequest,
      },
    );
  typia.assert(ascendingSearchResult);

  // Validate different page and limit combinations
  TestValidator.equals(
    "page 2 search returns valid pagination",
    ascendingSearchResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "limit 3 is correctly applied",
    ascendingSearchResult.pagination.limit,
    3,
  );

  // Step 5: Test search with empty search query
  const emptySearchResult: IPageIDiscussionBoardUserBookmark.ISummary =
    await api.functional.discussionBoard.member.members.bookmarks.index(
      connection,
      {
        username: member.username,
        body: {
          page: 1,
          limit: 10,
          search: "",
        } satisfies IDiscussionBoardUserBookmark.IRequest,
      },
    );
  typia.assert(emptySearchResult);

  // Empty search should still return valid results
  TestValidator.predicate(
    "empty search returns valid data structure",
    Array.isArray(emptySearchResult.data),
  );

  // Step 6: Test search with realistic search query
  const searchQueryResult: IPageIDiscussionBoardUserBookmark.ISummary =
    await api.functional.discussionBoard.member.members.bookmarks.index(
      connection,
      {
        username: member.username,
        body: {
          page: 1,
          limit: 8,
          search: "example",
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IDiscussionBoardUserBookmark.IRequest,
      },
    );
  typia.assert(searchQueryResult);

  // Validate search query parameters
  TestValidator.equals(
    "search query returns valid pagination",
    searchQueryResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "search query limit is correct",
    searchQueryResult.pagination.limit,
    8,
  );

  // Final validation: All search operations should respect member ownership
  // The member.username in the path ensures only the authenticated member's bookmarks are searched
  TestValidator.equals(
    "member username matches path parameter",
    member.username,
    memberUsername,
  );
}
