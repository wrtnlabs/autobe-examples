import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratorSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModeratorSession";

/**
 * Test session search behavior when the current page has no data.
 *
 * This test validates that the moderator session search API correctly handles
 * pagination scenarios where a requested page is beyond the available data.
 * When the page number exceeds the total pages, the API should return a valid
 * paginated response with an empty data array but correct pagination metadata
 * reflecting the total records and pages available.
 *
 * Note: True zero-record empty results cannot be tested because moderator
 * authentication requires account creation, which automatically creates an
 * initial session. The search API also lacks filtering parameters to exclude
 * existing sessions.
 *
 * Test Flow:
 *
 * 1. Create a moderator account (establishes initial authentication session)
 * 2. Execute session search requesting a page far beyond available data
 * 3. Verify the data array is empty (no sessions on that page)
 * 4. Validate pagination metadata correctly shows total records and pages
 * 5. Confirm current page and limit values match the request
 */
export async function test_api_moderator_session_search_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account to establish authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePassword123!";
  const moderatorUsername = RandomGenerator.name(1);

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: moderatorUsername,
      href: "https://example.com/moderator/register",
      referrer: "https://example.com/",
      ip: "192.168.1.100",
    } satisfies IDiscussionBoardModerator.ICreate,
  });

  typia.assert(moderator);

  // Step 2: Search for sessions on a page far beyond available data
  // This simulates an empty result for the current page while records exist overall
  const requestedPage = 999;
  const requestedLimit = 10;

  const emptyPageResult =
    await api.functional.discussionBoard.moderator.moderators.sessions.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          page: requestedPage,
          limit: requestedLimit,
        } satisfies IDiscussionBoardModeratorSession.IRequest,
      },
    );

  typia.assert(emptyPageResult);

  // Step 3: Validate that the data array is empty for this page
  TestValidator.equals(
    "data array should be empty for page beyond available data",
    emptyPageResult.data.length,
    0,
  );

  // Step 4: Verify pagination metadata reflects the actual data state
  // At least one session exists (the join session), so records should be >= 1
  TestValidator.predicate(
    "total records should be at least 1 since join created a session",
    emptyPageResult.pagination.records >= 1,
  );

  TestValidator.predicate(
    "total pages should be at least 1 since sessions exist",
    emptyPageResult.pagination.pages >= 1,
  );

  // Step 5: Verify the request parameters are reflected correctly
  TestValidator.equals(
    "current page should match requested page",
    emptyPageResult.pagination.current,
    requestedPage,
  );

  TestValidator.equals(
    "limit should match requested limit",
    emptyPageResult.pagination.limit,
    requestedLimit,
  );

  // Step 6: Verify the requested page exceeds available pages
  TestValidator.predicate(
    "requested page should be beyond total available pages",
    emptyPageResult.pagination.current > emptyPageResult.pagination.pages,
  );
}
