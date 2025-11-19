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
 * Test that moderation queue response includes contributor information.
 *
 * This test validates that when a moderator retrieves queue items from the
 * moderation queue endpoint, each item includes contributor information
 * (contributor ID and potentially username) for context about the article
 * authors without requiring separate API calls.
 *
 * The test workflow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Request the moderation queue with pagination
 * 3. Validate that the response includes queue items
 * 4. Verify each queue item contains contributor ID reference
 * 5. Confirm the response structure matches expected pagination format
 */
export async function test_api_moderation_queue_response_includes_contributor_info(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphabets(8) + "Aa1!";
  const moderatorUsername =
    RandomGenerator.alphabets(5) + RandomGenerator.alphaNumeric(3);

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  TestValidator.equals(
    "moderator email matches input",
    moderator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator username matches input",
    moderator.username,
    moderatorUsername,
  );
  TestValidator.predicate(
    "moderator has valid ID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      moderator.id,
    ),
  );

  // Step 2: Request moderation queue
  const queueResponse: IPageIDiscussionBoardModerationQueue.ISummary =
    await api.functional.discussionBoard.moderator.moderation.queue.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModerationQueue.IRequest,
      },
    );
  typia.assert(queueResponse);

  // Step 3: Validate response structure
  TestValidator.predicate(
    "queue response has pagination info",
    queueResponse.pagination !== null && queueResponse.pagination !== undefined,
  );

  TestValidator.predicate(
    "pagination has current page",
    queueResponse.pagination.current !== null &&
      queueResponse.pagination.current !== undefined,
  );

  TestValidator.predicate(
    "pagination has limit",
    queueResponse.pagination.limit !== null &&
      queueResponse.pagination.limit !== undefined,
  );

  TestValidator.predicate(
    "pagination has records count",
    queueResponse.pagination.records !== null &&
      queueResponse.pagination.records !== undefined,
  );

  TestValidator.predicate(
    "pagination has pages count",
    queueResponse.pagination.pages !== null &&
      queueResponse.pagination.pages !== undefined,
  );

  // Step 4: Validate queue items structure and contributor info
  TestValidator.predicate(
    "queue response has data array",
    Array.isArray(queueResponse.data),
  );

  if (queueResponse.data.length > 0) {
    // Validate each queue item contains required contributor reference
    for (const queueItem of queueResponse.data) {
      TestValidator.predicate(
        "queue item has ID",
        queueItem.id !== null &&
          queueItem.id !== undefined &&
          typeof queueItem.id === "string",
      );

      TestValidator.predicate(
        "queue item has discussion_board_contributor_id",
        queueItem.discussion_board_contributor_id !== null &&
          queueItem.discussion_board_contributor_id !== undefined &&
          typeof queueItem.discussion_board_contributor_id === "string",
      );

      TestValidator.predicate(
        "contributor_id is valid UUID format",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          queueItem.discussion_board_contributor_id,
        ),
      );

      TestValidator.predicate(
        "queue item has article_id reference",
        queueItem.discussion_board_article_id !== null &&
          queueItem.discussion_board_article_id !== undefined,
      );

      TestValidator.predicate(
        "queue item has submitted_at timestamp",
        queueItem.submitted_at !== null && queueItem.submitted_at !== undefined,
      );

      TestValidator.predicate(
        "queue item has priority field",
        ["normal", "high", "low"].includes(queueItem.priority),
      );

      TestValidator.predicate(
        "queue item has created_at timestamp",
        queueItem.created_at !== null && queueItem.created_at !== undefined,
      );

      TestValidator.predicate(
        "queue item has updated_at timestamp",
        queueItem.updated_at !== null && queueItem.updated_at !== undefined,
      );
    }
  }

  // Step 5: Validate response can be properly typed
  TestValidator.predicate(
    "response data is array of queue items",
    Array.isArray(queueResponse.data),
  );
}
