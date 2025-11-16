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
 * Test member search that returns no matching results.
 *
 * This test validates the proper handling of empty search result sets in the
 * member search API. A moderator authenticates and performs a search with
 * criteria specifically designed to match no existing members in the system.
 *
 * The test confirms that:
 *
 * 1. Empty result sets return a valid response structure
 * 2. The data array is empty when no members match
 * 3. Pagination metadata correctly shows 0 records and 0 pages
 * 4. The API handles the empty state without errors
 *
 * This scenario is critical for ensuring robust error-free operation when users
 * perform searches that yield no results, which is a common real-world use case
 * in member management interfaces.
 */
export async function test_api_member_search_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator to gain member search permissions
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Perform search with criteria guaranteed to return no results
  // Using a UUID-like random string as search term since usernames won't match this pattern
  const impossibleSearchTerm = typia.random<string & tags.Format<"uuid">>();

  const searchResult =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        page: 1,
        limit: 10,
        search: impossibleSearchTerm,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(searchResult);

  // Step 3: Validate empty data array
  TestValidator.equals("data array should be empty", searchResult.data, []);

  // Step 4: Validate pagination metadata shows zero records
  TestValidator.equals(
    "total records should be 0",
    searchResult.pagination.records,
    0,
  );

  // Step 5: Validate pagination metadata shows zero pages
  TestValidator.equals(
    "total pages should be 0",
    searchResult.pagination.pages,
    0,
  );

  // Validate pagination current page and limit are set correctly
  TestValidator.equals(
    "current page should be 1",
    searchResult.pagination.current,
    1,
  );

  TestValidator.equals("limit should be 10", searchResult.pagination.limit, 10);
}
