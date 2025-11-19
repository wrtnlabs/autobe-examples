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
 * Test sorting account restrictions by expiration date.
 *
 * Validates that moderators can retrieve account restrictions sorted by
 * expires_at timestamp in both ascending (soonest expiration first) and
 * descending order. This functionality is critical for moderators to identify
 * which restrictions will expire soon for renewal or closure decisions.
 *
 * Test workflow:
 *
 * 1. Authenticate as a moderator
 * 2. Query restrictions sorted by expires_at in ascending order
 * 3. Verify that restrictions are ordered from earliest to latest expiration date
 * 4. Query restrictions sorted by expires_at in descending order
 * 5. Verify that restrictions are ordered from latest to earliest expiration date
 * 6. Validate pagination works correctly with sorted results
 */
export async function test_api_moderation_restrictions_sort_by_expiration_date(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as a moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(10) + "A1!",
        username: RandomGenerator.alphabets(10),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Retrieve restrictions sorted by expires_at in ascending order
  const ascendingResult: IPageIDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.moderation.restrictions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          sort_by: "expires_at",
          order: "asc",
        } satisfies IDiscussionBoardAccountRestriction.IRequest,
      },
    );
  typia.assert(ascendingResult);

  // Step 3: Verify ascending order (soonest expiration first)
  if (ascendingResult.data.length > 1) {
    for (let i = 0; i < ascendingResult.data.length - 1; i++) {
      const current = ascendingResult.data[i];
      const next = ascendingResult.data[i + 1];

      // Handle null expires_at (permanent bans) - they should come last in ascending order
      if (current.expires_at === null && next.expires_at === null) {
        TestValidator.predicate(
          "permanent bans maintain order in ascending sort",
          true,
        );
      } else if (current.expires_at === null) {
        // Current is null, next is not - this is wrong for ascending
        TestValidator.predicate(
          "permanent bans should come after timed restrictions in ascending order",
          false,
        );
      } else if (next.expires_at === null) {
        // Next is null, current is not - this is correct
        TestValidator.predicate(
          "timed restriction comes before permanent ban in ascending order",
          true,
        );
      } else {
        // Both have dates - verify ascending order
        const currentDate = new Date(current.expires_at).getTime();
        const nextDate = new Date(next.expires_at).getTime();
        TestValidator.predicate(
          "restrictions ordered by expiration date ascending",
          currentDate <= nextDate,
        );
      }
    }
  }

  // Step 4: Retrieve restrictions sorted by expires_at in descending order
  const descendingResult: IPageIDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.moderation.restrictions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          sort_by: "expires_at",
          order: "desc",
        } satisfies IDiscussionBoardAccountRestriction.IRequest,
      },
    );
  typia.assert(descendingResult);

  // Step 5: Verify descending order (latest expiration first)
  if (descendingResult.data.length > 1) {
    for (let i = 0; i < descendingResult.data.length - 1; i++) {
      const current = descendingResult.data[i];
      const next = descendingResult.data[i + 1];

      // Handle null expires_at (permanent bans) - they should come first in descending order
      if (current.expires_at === null && next.expires_at === null) {
        TestValidator.predicate(
          "permanent bans maintain order in descending sort",
          true,
        );
      } else if (current.expires_at === null) {
        // Current is null, next is not - this is correct for descending
        TestValidator.predicate(
          "permanent bans should come before timed restrictions in descending order",
          true,
        );
      } else if (next.expires_at === null) {
        // Next is null, current is not - this is wrong for descending
        TestValidator.predicate(
          "permanent bans should come before timed restrictions in descending order",
          false,
        );
      } else {
        // Both have dates - verify descending order
        const currentDate = new Date(current.expires_at).getTime();
        const nextDate = new Date(next.expires_at).getTime();
        TestValidator.predicate(
          "restrictions ordered by expiration date descending",
          currentDate >= nextDate,
        );
      }
    }
  }

  // Step 6: Verify pagination information is correct
  TestValidator.predicate(
    "pagination current page is valid",
    ascendingResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    ascendingResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination total records is non-negative",
    ascendingResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination total pages is non-negative",
    ascendingResult.pagination.pages >= 0,
  );
}
