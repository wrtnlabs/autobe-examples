import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountRestriction";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAccountRestriction";

/**
 * Test sorting of account restrictions by imposed_at timestamp.
 *
 * This test validates that the moderation restrictions API correctly sorts
 * results by the imposed_at field (when the restriction was applied) in both
 * ascending and descending order. The test ensures moderators can retrieve
 * restriction records in chronological order for proper enforcement history
 * tracking and analysis.
 *
 * Test workflow:
 *
 * 1. Register a moderator account for authentication
 * 2. Query restrictions sorted by imposed_at ascending (oldest first)
 * 3. Verify results are in chronological order from earliest to latest
 * 4. Query restrictions sorted by imposed_at descending (newest first)
 * 5. Verify results are in reverse chronological order from latest to earliest
 * 6. Validate that both queries return consistent results with different ordering
 */
export async function test_api_moderation_restrictions_sort_by_imposed_date(
  connection: api.IConnection,
) {
  // 1. Register a moderator account for authentication
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "ValidPassword123!",
        username: RandomGenerator.alphaNumeric(8),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Query restrictions sorted by imposed_at ascending (oldest first)
  const ascendingResult: IPageIDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.moderation.restrictions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          sort_by: "imposed_at",
          order: "asc",
        } satisfies IDiscussionBoardAccountRestriction.IRequest,
      },
    );
  typia.assert(ascendingResult);

  // 3. Verify results are in chronological order (ascending by imposed_at)
  if (ascendingResult.data.length > 1) {
    for (let i = 0; i < ascendingResult.data.length - 1; i++) {
      const current = ascendingResult.data[i];
      const next = ascendingResult.data[i + 1];
      const currentDate = new Date(current.imposed_at);
      const nextDate = new Date(next.imposed_at);
      TestValidator.predicate(
        `ascending order: restriction at index ${i} imposed_at (${current.imposed_at}) should be <= next restriction (${next.imposed_at})`,
        currentDate <= nextDate,
      );
    }
  }

  // 4. Query restrictions sorted by imposed_at descending (newest first)
  const descendingResult: IPageIDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.moderation.restrictions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          sort_by: "imposed_at",
          order: "desc",
        } satisfies IDiscussionBoardAccountRestriction.IRequest,
      },
    );
  typia.assert(descendingResult);

  // 5. Verify results are in reverse chronological order (descending by imposed_at)
  if (descendingResult.data.length > 1) {
    for (let i = 0; i < descendingResult.data.length - 1; i++) {
      const current = descendingResult.data[i];
      const next = descendingResult.data[i + 1];
      const currentDate = new Date(current.imposed_at);
      const nextDate = new Date(next.imposed_at);
      TestValidator.predicate(
        `descending order: restriction at index ${i} imposed_at (${current.imposed_at}) should be >= next restriction (${next.imposed_at})`,
        currentDate >= nextDate,
      );
    }
  }

  // 6. Verify that both queries return the same records but in different order
  TestValidator.equals(
    "ascending and descending results should have same pagination total",
    ascendingResult.pagination.records,
    descendingResult.pagination.records,
  );

  // Verify pagination metadata is consistent
  TestValidator.equals(
    "ascending and descending should have same record count in this page",
    ascendingResult.data.length,
    descendingResult.data.length,
  );

  // Verify the first item in ascending is the last item in descending (if there are items)
  if (ascendingResult.data.length > 0 && descendingResult.data.length > 0) {
    TestValidator.equals(
      "first item in ascending should equal last item in descending",
      ascendingResult.data[0].id,
      descendingResult.data[descendingResult.data.length - 1].id,
    );

    // Verify the last item in ascending is the first item in descending
    TestValidator.equals(
      "last item in ascending should equal first item in descending",
      ascendingResult.data[ascendingResult.data.length - 1].id,
      descendingResult.data[0].id,
    );
  }
}
