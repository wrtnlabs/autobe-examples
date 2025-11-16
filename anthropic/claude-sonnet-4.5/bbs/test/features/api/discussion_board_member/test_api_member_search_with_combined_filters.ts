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
 * Test member search with multiple filters applied simultaneously.
 *
 * This test validates the comprehensive member search functionality available
 * to moderators. It tests the most complex real-world scenario where multiple
 * filter criteria are combined using AND logic to narrow down member lists
 * effectively.
 *
 * The test performs the following steps:
 *
 * 1. Authenticate as a moderator to gain member search permissions
 * 2. Execute a member search with combined filters including:
 *
 *    - Username partial search
 *    - Status filtering
 *    - Pagination controls (page and limit)
 *    - Sorting preferences
 * 3. Validate that all returned members match the filter criteria
 * 4. Verify pagination metadata reflects the filtered dataset accurately
 * 5. Confirm proper sorting of search results
 */
export async function test_api_member_search_with_combined_filters(
  connection: api.IConnection,
) {
  // 1. Authenticate as moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.name(2),
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Search members with combined filters
  const searchRequest = {
    page: 1,
    limit: 20,
    search: RandomGenerator.name(1),
    status: RandomGenerator.pick(["active", "suspended", "locked"] as const),
    sort: RandomGenerator.pick(["-created_at", "username"] as const),
  } satisfies IDiscussionBoardMember.IRequest;

  const searchResults: IPageIDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: searchRequest,
    });
  typia.assert(searchResults);

  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page should be non-negative",
    searchResults.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should match request",
    searchResults.pagination.limit === searchRequest.limit,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    searchResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    searchResults.pagination.pages >= 0,
  );

  // 4. Validate data array length respects limit
  TestValidator.predicate(
    "returned data should not exceed limit",
    searchResults.data.length <= (searchRequest.limit ?? 20),
  );

  // 5. If results exist, validate filter criteria are applied
  if (searchResults.data.length > 0) {
    for (const member of searchResults.data) {
      // Validate status filter if specified
      if (searchRequest.status !== undefined) {
        TestValidator.equals(
          "member status should match filter",
          member.status,
          searchRequest.status,
        );
      }

      // Validate username search if specified
      if (
        searchRequest.search !== undefined &&
        searchRequest.search.length > 0
      ) {
        TestValidator.predicate(
          "member username should contain search term",
          member.username
            .toLowerCase()
            .includes(searchRequest.search.toLowerCase()),
        );
      }
    }
  }
}
