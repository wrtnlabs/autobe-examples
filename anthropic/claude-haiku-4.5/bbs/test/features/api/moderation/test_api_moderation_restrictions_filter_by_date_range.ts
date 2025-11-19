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
 * Test filtering restrictions by imposition date range.
 *
 * This test validates that the moderation restrictions search API correctly
 * filters account restrictions based on when they were imposed. It verifies
 * that returned restrictions have imposed_at timestamps falling within the
 * specified date range (inclusive on both ends), and that pagination and
 * sorting work correctly with date range filtering.
 *
 * Steps:
 *
 * 1. Authenticate as a moderator with valid credentials
 * 2. Query restrictions imposed within a specific date range
 * 3. Verify all returned restrictions are within the specified time window
 * 4. Test pagination with date range filtering
 * 5. Test sorting by imposed_at with date range filtering
 * 6. Verify inclusive boundaries (imposed_from and imposed_to)
 */
export async function test_api_moderation_restrictions_filter_by_date_range(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(8) + "A1!",
        username: RandomGenerator.alphabets(10),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator should be authenticated",
    moderator.id !== undefined,
  );

  // Step 2: Create date range for filtering
  const now = new Date();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  // Step 3: Search for restrictions within a date range
  const restrictionsInRange: IPageIDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.moderation.restrictions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          imposed_from: twoWeeksAgo.toISOString(),
          imposed_to: now.toISOString(),
        } satisfies IDiscussionBoardAccountRestriction.IRequest,
      },
    );
  typia.assert(restrictionsInRange);

  // Step 4: Verify all restrictions are within the date range
  restrictionsInRange.data.forEach((restriction) => {
    const imposedTime = new Date(restriction.imposed_at);
    TestValidator.predicate(
      "restriction imposed_at should be on or after imposed_from",
      imposedTime >= twoWeeksAgo,
    );
    TestValidator.predicate(
      "restriction imposed_at should be on or before imposed_to",
      imposedTime <= now,
    );
  });

  // Step 5: Test pagination with date range filtering
  const page2: IPageIDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.moderation.restrictions.index(
      connection,
      {
        body: {
          page: 2,
          limit: 20,
          imposed_from: twoWeeksAgo.toISOString(),
          imposed_to: now.toISOString(),
        } satisfies IDiscussionBoardAccountRestriction.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.predicate(
    "pagination should work with date range",
    page2.pagination !== undefined,
  );

  // Step 6: Test sorting by imposed_at (descending)
  const sortedByImposedDescending: IPageIDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.moderation.restrictions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          imposed_from: twoWeeksAgo.toISOString(),
          imposed_to: now.toISOString(),
          sort_by: "imposed_at",
          order: "desc",
        } satisfies IDiscussionBoardAccountRestriction.IRequest,
      },
    );
  typia.assert(sortedByImposedDescending);

  // Step 7: Verify sorting order (descending)
  if (sortedByImposedDescending.data.length > 1) {
    for (let i = 0; i < sortedByImposedDescending.data.length - 1; i++) {
      const current = new Date(
        sortedByImposedDescending.data[i].imposed_at,
      ).getTime();
      const next = new Date(
        sortedByImposedDescending.data[i + 1].imposed_at,
      ).getTime();
      TestValidator.predicate(
        "restrictions should be sorted by imposed_at descending",
        current >= next,
      );
    }
  }

  // Step 8: Test sorting by imposed_at (ascending)
  const sortedByImposedAscending: IPageIDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.moderation.restrictions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          imposed_from: twoWeeksAgo.toISOString(),
          imposed_to: now.toISOString(),
          sort_by: "imposed_at",
          order: "asc",
        } satisfies IDiscussionBoardAccountRestriction.IRequest,
      },
    );
  typia.assert(sortedByImposedAscending);

  // Step 9: Verify sorting order (ascending)
  if (sortedByImposedAscending.data.length > 1) {
    for (let i = 0; i < sortedByImposedAscending.data.length - 1; i++) {
      const current = new Date(
        sortedByImposedAscending.data[i].imposed_at,
      ).getTime();
      const next = new Date(
        sortedByImposedAscending.data[i + 1].imposed_at,
      ).getTime();
      TestValidator.predicate(
        "restrictions should be sorted by imposed_at ascending",
        current <= next,
      );
    }
  }

  // Step 10: Test narrow date range (3 days)
  const narrowRangeRestrictions: IPageIDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.moderation.restrictions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          imposed_from: threeDaysAgo.toISOString(),
          imposed_to: now.toISOString(),
        } satisfies IDiscussionBoardAccountRestriction.IRequest,
      },
    );
  typia.assert(narrowRangeRestrictions);

  // Step 11: Verify all restrictions in narrow range are within bounds
  narrowRangeRestrictions.data.forEach((restriction) => {
    const imposedTime = new Date(restriction.imposed_at);
    TestValidator.predicate(
      "narrow range restriction should be on or after imposed_from",
      imposedTime >= threeDaysAgo,
    );
    TestValidator.predicate(
      "narrow range restriction should be on or before imposed_to",
      imposedTime <= now,
    );
  });

  // Step 12: Verify pagination info is consistent
  TestValidator.predicate(
    "pagination current page should be 1",
    restrictionsInRange.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 20",
    restrictionsInRange.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    restrictionsInRange.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    restrictionsInRange.pagination.pages >= 0,
  );
}
