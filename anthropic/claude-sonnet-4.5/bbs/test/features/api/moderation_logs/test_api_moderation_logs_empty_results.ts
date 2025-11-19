import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationLog";

/**
 * Test retrieving moderation logs when no entries match the filter criteria.
 *
 * This scenario validates proper handling of empty result sets, such as
 * filtering for actions within a date range that contains no moderation
 * activity or filtering by a moderator who has not yet performed any actions.
 * The moderator authenticates and submits a request with filters that yield no
 * matching results.
 *
 * The test verifies that the response returns an empty data array with
 * pagination metadata showing zero total records, rather than generating
 * errors, supporting robust filtering even when criteria match no log entries.
 *
 * Test flow:
 *
 * 1. Create and authenticate a new moderator account
 * 2. Query moderation logs with filters that yield no results
 * 3. Verify the response contains an empty data array
 * 4. Validate pagination metadata shows zero records and pages
 */
export async function test_api_moderation_logs_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Query moderation logs with filters that yield no results
  // Using a date range in the past where no moderation activity exists
  const farPastDate = new Date("2020-01-01T00:00:00Z").toISOString();
  const farPastEndDate = new Date("2020-01-02T00:00:00Z").toISOString();

  const emptyResult =
    await api.functional.discussionBoard.moderator.moderationLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          from_date: farPastDate,
          to_date: farPastEndDate,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(emptyResult);

  // Step 3: Verify the response contains an empty data array
  TestValidator.equals("data array should be empty", emptyResult.data, []);

  // Step 4: Validate pagination metadata shows zero records and pages
  TestValidator.equals(
    "total records should be zero",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages should be zero",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page should be 1",
    emptyResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit should be positive",
    emptyResult.pagination.limit > 0,
  );

  // Additional test: Query with a non-existent moderator_id filter
  const nonExistentModeratorId = typia.random<string & tags.Format<"uuid">>();
  const emptyResultByModerator =
    await api.functional.discussionBoard.moderator.moderationLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          moderator_id: nonExistentModeratorId,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(emptyResultByModerator);

  // Verify empty results for moderator filter
  TestValidator.equals(
    "data array should be empty for non-existent moderator",
    emptyResultByModerator.data,
    [],
  );
  TestValidator.equals(
    "total records should be zero for moderator filter",
    emptyResultByModerator.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages should be zero for moderator filter",
    emptyResultByModerator.pagination.pages,
    0,
  );
}
