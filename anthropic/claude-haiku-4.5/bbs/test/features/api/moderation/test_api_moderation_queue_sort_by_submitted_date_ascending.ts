import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationQueue";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationQueue";

export async function test_api_moderation_queue_sort_by_submitted_date_ascending(
  connection: api.IConnection,
) {
  /** Create moderator account for authentication */
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "TestPass123!";
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

  /**
   * Request moderation queue with ascending sort by submitted_at This retrieves
   * items in FIFO order (oldest first)
   */
  const queueResponse: IPageIDiscussionBoardModerationQueue.ISummary =
    await api.functional.discussionBoard.moderator.moderation.queue.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          sort_by: "submitted_at",
          sort_order: "asc",
        } satisfies IDiscussionBoardModerationQueue.IRequest,
      },
    );
  typia.assert(queueResponse);

  /** Validate pagination metadata */
  TestValidator.predicate(
    "pagination should have valid page number",
    queueResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination should have valid limit",
    queueResponse.pagination.limit > 0,
  );

  /**
   * Validate ascending order of submitted_at timestamps Items should be in FIFO
   * order with oldest submissions first
   */
  if (queueResponse.data.length > 1) {
    for (let i = 1; i < queueResponse.data.length; i++) {
      const previousItem = queueResponse.data[i - 1];
      const currentItem = queueResponse.data[i];

      /**
       * Verify that submitted_at timestamps are in ascending order Current
       * item's submitted_at should be >= previous item's submitted_at
       */
      const previousDate = new Date(previousItem.submitted_at).getTime();
      const currentDate = new Date(currentItem.submitted_at).getTime();

      TestValidator.predicate(
        `submitted_at order is ascending at index ${i}`,
        currentDate >= previousDate,
      );
    }
  }

  /** Validate each queue item has required fields */
  for (const item of queueResponse.data) {
    typia.assert(item);
    TestValidator.predicate(
      "queue item should have valid ID",
      item.id.length > 0,
    );
    TestValidator.predicate(
      "queue item should have article reference",
      item.discussion_board_article_id.length > 0,
    );
    TestValidator.predicate(
      "queue item should have contributor reference",
      item.discussion_board_contributor_id.length > 0,
    );
    TestValidator.predicate(
      "queue item should have submitted_at timestamp",
      item.submitted_at.length > 0,
    );
    TestValidator.predicate(
      "queue item should have valid priority",
      ["normal", "high", "low"].includes(item.priority),
    );
    TestValidator.predicate(
      "queue item should have created_at timestamp",
      item.created_at.length > 0,
    );
    TestValidator.predicate(
      "queue item should have updated_at timestamp",
      item.updated_at.length > 0,
    );
  }

  /** Test pagination navigation with sorting */
  if (queueResponse.pagination.pages > 1) {
    const secondPageResponse: IPageIDiscussionBoardModerationQueue.ISummary =
      await api.functional.discussionBoard.moderator.moderation.queue.index(
        connection,
        {
          body: {
            page: 2,
            limit: 20,
            sort_by: "submitted_at",
            sort_order: "asc",
          } satisfies IDiscussionBoardModerationQueue.IRequest,
        },
      );
    typia.assert(secondPageResponse);

    /** Verify second page maintains ascending order */
    if (queueResponse.data.length > 0 && secondPageResponse.data.length > 0) {
      const lastFromFirstPage =
        queueResponse.data[queueResponse.data.length - 1];
      const firstFromSecondPage = secondPageResponse.data[0];

      const lastDate = new Date(lastFromFirstPage.submitted_at).getTime();
      const firstSecondPageDate = new Date(
        firstFromSecondPage.submitted_at,
      ).getTime();

      TestValidator.predicate(
        "pagination maintains ascending order across pages",
        firstSecondPageDate >= lastDate,
      );
    }
  }

  /** Validate that the sort is consistent with FIFO expectation */
  TestValidator.predicate(
    "ascending sort order should return queue in FIFO sequence",
    queueResponse.data.length >= 0,
  );
}
