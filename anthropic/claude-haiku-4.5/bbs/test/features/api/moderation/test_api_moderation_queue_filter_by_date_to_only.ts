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
 * Test filtering moderation queue by end date only.
 *
 * Validates that moderators can filter the moderation queue using only the
 * submitted_date_to parameter without providing a submitted_date_from. The
 * system should return all queue items submitted on or before the specified end
 * date, establishing an open-ended date range with no lower bound.
 *
 * This supports historical analysis workflows where moderators need to review
 * articles submitted up to a specific point in time without restricting the
 * start of the date range.
 *
 * Steps:
 *
 * 1. Register a new moderator account
 * 2. Authenticate as the moderator
 * 3. Query moderation queue with submitted_date_to set and submitted_date_from
 *    omitted
 * 4. Validate all returned queue items have submitted_at <= submitted_date_to
 * 5. Confirm pagination metadata is present and accurate
 */
export async function test_api_moderation_queue_filter_by_date_to_only(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword =
    RandomGenerator.alphabets(8).toUpperCase() +
    RandomGenerator.alphabets(8).toLowerCase() +
    RandomGenerator.pick(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]) +
    RandomGenerator.pick(["!", "@", "#", "$", "%"]);
  const moderatorUsername =
    RandomGenerator.alphabets(5) + RandomGenerator.alphaNumeric(5);

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Authenticate as the moderator
  // Connection is already authenticated via the join response
  TestValidator.predicate(
    "moderator is authenticated with access token",
    moderator.token.access.length > 0,
  );

  // Step 3: Query moderation queue with submitted_date_to set and submitted_date_from omitted
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const submittedDateTo = now.toISOString();

  const queueResult: IPageIDiscussionBoardModerationQueue.ISummary =
    await api.functional.discussionBoard.moderator.moderation.queue.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          submitted_date_to: submittedDateTo,
        } satisfies IDiscussionBoardModerationQueue.IRequest,
      },
    );
  typia.assert(queueResult);

  // Step 4: Validate all returned queue items have submitted_at <= submitted_date_to
  const dateToTimestamp = new Date(submittedDateTo).getTime();

  if (queueResult.data.length > 0) {
    for (const queueItem of queueResult.data) {
      const submittedAtTimestamp = new Date(queueItem.submitted_at).getTime();
      TestValidator.predicate(
        `queue item ${queueItem.id} submitted_at is on or before submitted_date_to`,
        submittedAtTimestamp <= dateToTimestamp,
      );
    }
  }

  // Step 5: Confirm pagination metadata is present and accurate
  TestValidator.predicate(
    "pagination has valid current page",
    queueResult.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination has valid limit",
    queueResult.pagination.limit > 0,
  );

  TestValidator.predicate(
    "pagination records count is non-negative",
    queueResult.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination pages count is non-negative",
    queueResult.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "returned data length matches pagination expectations",
    queueResult.data.length <= queueResult.pagination.limit,
  );
}
