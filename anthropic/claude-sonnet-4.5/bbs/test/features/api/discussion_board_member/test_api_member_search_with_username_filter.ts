import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";

/**
 * Test member search functionality with username filtering.
 *
 * This test validates that moderators can search for discussion board members
 * using partial username matching. The search should be case-insensitive and
 * return only members whose usernames contain the search term.
 *
 * Test workflow:
 *
 * 1. Authenticate as moderator to gain member search access
 * 2. Perform username search with partial matching term
 * 3. Validate that all returned members have usernames containing the search term
 * 4. Verify case-insensitive matching works correctly
 * 5. Confirm pagination metadata is accurate
 * 6. Ensure member summary structure is valid through typia.assert
 */
export async function test_api_member_search_with_username_filter(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Perform member search with username filter
  // Using a search term that tests partial, case-insensitive matching
  const searchTerm = "user";

  const searchResult: IPageIDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        search: searchTerm,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(searchResult);

  // Step 3: Validate pagination metadata structure
  TestValidator.predicate(
    "pagination should have valid current page",
    searchResult.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination should have positive limit",
    searchResult.pagination.limit > 0,
  );

  TestValidator.predicate(
    "pagination should have non-negative records count",
    searchResult.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination should have non-negative pages count",
    searchResult.pagination.pages >= 0,
  );

  // Step 4: Validate search results - all members should have username containing search term (case-insensitive)
  for (const member of searchResult.data) {
    // typia.assert performs COMPLETE validation - no additional checks needed
    typia.assert(member);

    // Validate business logic: username should contain search term (case-insensitive)
    TestValidator.predicate(
      "member username should contain search term (case-insensitive)",
      member.username.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }

  // Step 5: Test case-insensitive matching with mixed-case search term
  const mixedCaseSearchTerm = "UsEr";

  const mixedCaseSearchResult: IPageIDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        search: mixedCaseSearchTerm,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(mixedCaseSearchResult);

  // Validate case-insensitive matching works correctly
  for (const member of mixedCaseSearchResult.data) {
    typia.assert(member);

    TestValidator.predicate(
      "case-insensitive search should match usernames regardless of case",
      member.username.toLowerCase().includes(mixedCaseSearchTerm.toLowerCase()),
    );
  }
}
