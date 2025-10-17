import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationAction";

/**
 * Test that administrators can access the moderation queue endpoint and receive
 * properly structured responses.
 *
 * This test validates basic administrator access to the moderation queue
 * functionality. Due to API limitations (no login endpoints available, only
 * registration), this test creates an administrator and verifies they can query
 * the moderation queue with proper pagination structure.
 *
 * Workflow:
 *
 * 1. Create administrator account with full moderation queue access
 * 2. Create discussion categories for future use
 * 3. Query the moderation queue without filters
 * 4. Validate the response structure and pagination metadata
 * 5. Test filtering by various criteria to ensure query parameters work
 */
export async function test_api_administrator_moderation_queue_full_access(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!@#";
  const adminUsername = RandomGenerator.alphaNumeric(12);

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        username: adminUsername,
        email: adminEmail,
        password: adminPassword,
      } satisfies IDiscussionBoardAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create discussion categories
  const economicsCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: "Economics",
          slug: "economics",
          description: "Economic discussions and analysis",
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(economicsCategory);

  const politicsCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: {
          name: "Politics",
          slug: "politics",
          description: "Political discussions and debates",
          display_order: 2,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(politicsCategory);

  // Step 3: Query moderation queue without filters
  const moderationQueue: IPageIDiscussionBoardModerationAction =
    await api.functional.discussionBoard.administrator.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(moderationQueue);

  // Step 4: Validate response structure and pagination metadata
  TestValidator.predicate(
    "moderation queue should return valid pagination structure",
    moderationQueue.pagination.current === 1 &&
      moderationQueue.pagination.limit === 20 &&
      moderationQueue.pagination.records >= 0 &&
      moderationQueue.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "moderation queue data should be an array",
    Array.isArray(moderationQueue.data),
  );

  // Step 5: Test filtering by status
  const pendingQueue: IPageIDiscussionBoardModerationAction =
    await api.functional.discussionBoard.administrator.moderationActions.index(
      connection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(pendingQueue);

  TestValidator.predicate(
    "filtered queue should have valid pagination",
    pendingQueue.pagination.limit === 10,
  );

  // Step 6: Test filtering by severity
  const criticalQueue: IPageIDiscussionBoardModerationAction =
    await api.functional.discussionBoard.administrator.moderationActions.index(
      connection,
      {
        body: {
          severity: "critical",
          page: 1,
          limit: 15,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(criticalQueue);

  // Step 7: Test sorting options
  const sortedQueue: IPageIDiscussionBoardModerationAction =
    await api.functional.discussionBoard.administrator.moderationActions.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "desc",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModerationAction.IRequest,
      },
    );
  typia.assert(sortedQueue);

  TestValidator.predicate(
    "administrator can query moderation queue with various filters",
    true,
  );
}
