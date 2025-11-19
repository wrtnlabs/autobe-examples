import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerator";

/**
 * Test filtering moderators by account creation date range.
 *
 * This test validates the moderator search API's ability to filter results
 * using created_at_from and created_at_to parameters. It verifies that:
 *
 * 1. Only created_at_from returns moderators created on or after that date
 * 2. Only created_at_to returns moderators created on or before that date
 * 3. Both parameters return moderators within the inclusive date range
 * 4. Neither parameter returns all moderators
 * 5. Pagination metadata accurately reflects filtered counts
 * 6. Edge cases handle empty and full result sets correctly
 */
export async function test_api_moderator_search_with_creation_date_range(
  connection: api.IConnection,
) {
  // Create multiple moderator accounts for testing date range filtering
  const moderators: IDiscussionBoardModerator.IAuthorized[] =
    await ArrayUtil.asyncRepeat(5, async (index) => {
      const moderator = await api.functional.auth.moderator.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "TestPassword123!",
          username: `testmod_${RandomGenerator.alphaNumeric(8)}`,
          display_name: RandomGenerator.name(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardModerator.ICreate,
      });
      typia.assert(moderator);

      // Small delay to ensure different creation timestamps
      if (index < 4) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      return moderator;
    });

  // Sort moderators by creation date for predictable testing
  const sortedModerators = moderators.sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  // Test 1: Search with created_at_from only (moderators created on or after)
  const middleIndex = Math.floor(sortedModerators.length / 2);
  const fromDate = sortedModerators[middleIndex].created_at;

  const resultWithFrom =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          created_at_from: fromDate,
          limit: 100,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(resultWithFrom);

  TestValidator.predicate(
    "created_at_from should filter moderators created on or after the specified date",
    resultWithFrom.data.every(
      (mod) => new Date(mod.created_at) >= new Date(fromDate),
    ),
  );

  TestValidator.predicate(
    "created_at_from should include moderators from the specified date onwards",
    resultWithFrom.data.length >= sortedModerators.length - middleIndex,
  );

  // Test 2: Search with created_at_to only (moderators created on or before)
  const toDate = sortedModerators[middleIndex].created_at;

  const resultWithTo =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          created_at_to: toDate,
          limit: 100,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(resultWithTo);

  TestValidator.predicate(
    "created_at_to should filter moderators created on or before the specified date",
    resultWithTo.data.every(
      (mod) => new Date(mod.created_at) <= new Date(toDate),
    ),
  );

  // Test 3: Search with both created_at_from and created_at_to (date range)
  const rangeFrom = sortedModerators[1].created_at;
  const rangeTo = sortedModerators[sortedModerators.length - 2].created_at;

  const resultWithRange =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          created_at_from: rangeFrom,
          created_at_to: rangeTo,
          limit: 100,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(resultWithRange);

  TestValidator.predicate(
    "date range should filter moderators within inclusive boundaries",
    resultWithRange.data.every((mod) => {
      const createdAt = new Date(mod.created_at);
      return createdAt >= new Date(rangeFrom) && createdAt <= new Date(rangeTo);
    }),
  );

  // Test 4: Search with neither parameter (all moderators)
  const resultAll =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          limit: 100,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(resultAll);

  TestValidator.predicate(
    "search without date filters should return all moderators",
    resultAll.data.length >= sortedModerators.length,
  );

  // Test 5: Edge case - date range with no matching moderators (future date)
  const futureDate = new Date(Date.now() + 86400000 * 365).toISOString();

  const resultEmpty =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          created_at_from: futureDate,
          limit: 100,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(resultEmpty);

  TestValidator.predicate(
    "future date range should return empty results",
    resultEmpty.data.length === 0,
  );

  TestValidator.equals(
    "pagination metadata should reflect empty results",
    resultEmpty.pagination.records,
    0,
  );

  // Test 6: Edge case - date range that includes all created moderators
  const veryPastDate = new Date(Date.now() - 86400000 * 365).toISOString();
  const veryFutureDate = new Date(Date.now() + 86400000 * 365).toISOString();

  const resultAllInRange =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          created_at_from: veryPastDate,
          created_at_to: veryFutureDate,
          limit: 100,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(resultAllInRange);

  TestValidator.predicate(
    "wide date range should include all test moderators",
    resultAllInRange.data.filter((mod) =>
      sortedModerators.some((sm) => sm.id === mod.id),
    ).length === sortedModerators.length,
  );

  // Validate pagination metadata consistency
  TestValidator.predicate(
    "pagination current page should be valid",
    resultWithFrom.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit should be valid",
    resultWithFrom.pagination.limit > 0,
  );

  TestValidator.predicate(
    "pagination records should match data length when not paginated",
    resultWithFrom.pagination.records >= resultWithFrom.data.length,
  );
}
