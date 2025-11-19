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
 * Test filtering moderation queue by contributor_id to display only articles
 * submitted by a specific contributor.
 *
 * This test validates the moderator's ability to filter the moderation queue by
 * contributor ID. The test creates a moderator account, then requests the
 * moderation queue filtered by a specific contributor UUID. The system returns
 * only articles submitted by that contributor, with pagination support. This
 * enables moderators to review all submissions from a particular author,
 * supporting contributor-specific review workflows.
 *
 * Test Flow:
 *
 * 1. Create and authenticate moderator account
 * 2. Generate a specific contributor UUID for filtering
 * 3. Request moderation queue with contributor_id filter
 * 4. Validate that returned items only contain the specified contributor
 * 5. Verify pagination information is correctly populated
 * 6. Confirm all queue items reference the correct contributor ID
 */
export async function test_api_moderation_queue_filter_by_contributor_id(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePass123!",
        username: RandomGenerator.alphaNumeric(10),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Generate specific contributor UUID for filtering
  const contributorId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Request moderation queue filtered by contributor_id
  const queueResponse: IPageIDiscussionBoardModerationQueue.ISummary =
    await api.functional.discussionBoard.moderator.moderation.queue.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          contributor_id: contributorId,
        } satisfies IDiscussionBoardModerationQueue.IRequest,
      },
    );
  typia.assert(queueResponse);

  // Step 4: Validate that all returned items have the specified contributor ID
  for (const item of queueResponse.data) {
    TestValidator.equals(
      "queue item contributor ID matches filter",
      item.discussion_board_contributor_id,
      contributorId,
    );
  }

  // Step 5: Verify pagination information is correctly populated
  TestValidator.predicate(
    "pagination current page is correct",
    queueResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is correct",
    queueResponse.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    queueResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    queueResponse.pagination.pages >= 0,
  );

  // Step 6: Confirm data array structure
  TestValidator.predicate(
    "queue data is an array",
    Array.isArray(queueResponse.data),
  );
}
