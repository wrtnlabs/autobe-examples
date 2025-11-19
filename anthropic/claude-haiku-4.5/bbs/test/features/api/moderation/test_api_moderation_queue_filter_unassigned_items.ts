import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationQueue";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationQueue";

/**
 * Test filtering moderation queue to display only unassigned items awaiting
 * moderator pickup.
 *
 * Moderator authenticates and retrieves queue items with
 * assigned_moderator_id=null filter. The system returns only queue items where
 * no moderator has been assigned, representing available work items ready for
 * assignment. Validates that all returned items have assigned_moderator_id=null
 * and review_started_at=null, confirming these items are ready for moderator
 * assignment and review initiation. This is critical for the initial queue
 * browsing phase where moderators select work items to review.
 *
 * Process:
 *
 * 1. Create new moderator account
 * 2. Authenticate moderator to obtain access token
 * 3. Request moderation queue filtered by assigned_moderator_id=null
 * 4. Verify all returned items have null assignment and review status
 * 5. Validate pagination metadata
 */
export async function test_api_moderation_queue_filter_unassigned_items(
  connection: api.IConnection,
) {
  // 1. Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword =
    RandomGenerator.alphabets(8) +
    RandomGenerator.alphabets(1).toUpperCase() +
    "1" +
    "!";
  const moderatorUsername = RandomGenerator.alphabets(10);

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Moderator is authenticated - access token is set in connection headers
  TestValidator.predicate(
    "moderator account created and authenticated",
    moderator.id !== null && moderator.email === moderatorEmail,
  );

  // 3. Request moderation queue with filter for unassigned items (assigned_moderator_id=null)
  const queueResponse: IPageIDiscussionBoardModerationQueue.ISummary =
    await api.functional.discussionBoard.moderator.moderation.queue.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          assigned_moderator_id: null,
        } satisfies IDiscussionBoardModerationQueue.IRequest,
      },
    );
  typia.assert(queueResponse);

  // 4. Validate all returned items have assigned_moderator_id=null and review_started_at=null
  if (queueResponse.data.length > 0) {
    for (const item of queueResponse.data) {
      TestValidator.equals(
        "queue item has null assigned moderator",
        item.assigned_moderator_id,
        null,
      );
      TestValidator.equals(
        "queue item has null review started timestamp",
        item.review_started_at,
        null,
      );
      TestValidator.predicate(
        "queue item has valid article reference",
        item.discussion_board_article_id !== null,
      );
      TestValidator.predicate(
        "queue item has valid contributor reference",
        item.discussion_board_contributor_id !== null,
      );
    }
  }

  // 5. Validate pagination metadata
  TestValidator.predicate(
    "pagination has valid current page",
    queueResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    queueResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has valid total records count",
    queueResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid total pages count",
    queueResponse.pagination.pages >= 0,
  );
}
