import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerator";

/**
 * Test the moderator search functionality when no results match the search
 * criteria.
 *
 * This test validates that the search API gracefully handles empty result sets
 * by:
 *
 * 1. Authenticating as a moderator to gain access to the search endpoint
 * 2. Performing a search with criteria that will not match any existing moderators
 * 3. Validating that the response returns an empty data array
 * 4. Confirming pagination metadata shows 0 records and 0 pages
 *
 * This ensures the API properly handles edge cases where no moderators match
 * the search criteria.
 */
export async function test_api_moderator_search_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a moderator
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "testPassword123",
    username: RandomGenerator.name(1),
    ip: "192.168.1.100",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const authenticatedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(authenticatedModerator);

  // Step 2: Perform search with criteria that will not match any existing moderators
  // Use a random UUID as search term which is extremely unlikely to match any username or email
  const nonExistentSearchTerm = typia.random<string & tags.Format<"uuid">>();

  const searchRequest = {
    page: 1,
    limit: 10,
    search: nonExistentSearchTerm,
  } satisfies IDiscussionBoardModerator.IRequest;

  const searchResult: IPageIDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(searchResult);

  // Step 3: Validate empty data array
  TestValidator.equals(
    "search result data should be empty array",
    searchResult.data,
    [],
  );

  // Step 4: Validate pagination metadata shows 0 records and 0 pages
  TestValidator.equals(
    "pagination records should be 0",
    searchResult.pagination.records,
    0,
  );

  TestValidator.equals(
    "pagination pages should be 0",
    searchResult.pagination.pages,
    0,
  );

  TestValidator.equals(
    "pagination current page should be 1",
    searchResult.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination limit should match request",
    searchResult.pagination.limit,
    10,
  );
}
