import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test that the pending articles endpoint correctly returns an empty or minimal
 * paginated response when no articles are awaiting approval.
 *
 * Verifies that when a moderator accesses the pending articles queue, the
 * system properly handles the case where the pending_approval queue is empty,
 * returning pagination metadata with zero records and an empty data array. The
 * test ensures that pagination information is still properly formatted even
 * with no pending content, enabling client UI to display appropriate empty
 * state messages correctly.
 *
 * Test steps:
 *
 * 1. Create a moderator account by joining the moderation system
 * 2. Authenticate the moderator with proper credentials
 * 3. Query the pending articles endpoint with a valid search query
 * 4. Verify the response has proper pagination structure
 * 5. Validate that the data array is empty (no pending articles)
 * 6. Confirm pagination metadata shows zero records and zero pages
 * 7. Verify that empty state can be properly displayed by client UI
 */
export async function test_api_pending_articles_empty_queue(
  connection: api.IConnection,
) {
  // Step 1 & 2: Create and authenticate moderator
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorUsername: string = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const moderatorPassword: string = typia.random<string & tags.MinLength<8>>();
  const moderatorDisplayName: string = RandomGenerator.name();

  const authorized: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
        display_name: moderatorDisplayName,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(authorized);

  // Step 3: Query pending articles with valid search criteria
  const pendingArticlesResponse: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.moderator.moderation.pending_articles.index(
      connection,
      {
        body: {
          q: "test", // Valid search query to get all pending articles
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(pendingArticlesResponse);

  // Step 4 & 5 & 6: Validate pagination structure and empty state
  TestValidator.predicate(
    "response should have valid pagination metadata",
    pendingArticlesResponse.pagination !== undefined &&
      typeof pendingArticlesResponse.pagination.current === "number" &&
      typeof pendingArticlesResponse.pagination.limit === "number" &&
      typeof pendingArticlesResponse.pagination.records === "number" &&
      typeof pendingArticlesResponse.pagination.pages === "number",
  );

  TestValidator.equals(
    "pagination records count should be zero for empty queue",
    pendingArticlesResponse.pagination.records,
    0,
  );

  TestValidator.equals(
    "pagination pages count should be zero for empty queue",
    pendingArticlesResponse.pagination.pages,
    0,
  );

  TestValidator.predicate(
    "data array should be empty",
    Array.isArray(pendingArticlesResponse.data) &&
      pendingArticlesResponse.data.length === 0,
  );

  // Step 7: Verify empty state structure is ready for UI display
  TestValidator.predicate(
    "pending queue should display proper empty state",
    pendingArticlesResponse.pagination.records === 0 &&
      pendingArticlesResponse.data.length === 0,
  );
}
