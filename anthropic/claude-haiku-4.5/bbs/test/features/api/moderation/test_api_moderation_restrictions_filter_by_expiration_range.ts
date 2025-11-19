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
 * Test filtering account restrictions by expiration date range.
 *
 * Validates that the moderation API correctly filters restrictions based on
 * expires_from and expires_to date parameters. This test ensures the filter
 * functionality works properly for moderators to identify restrictions expiring
 * within specific time windows for proactive moderation management.
 *
 * Test workflow:
 *
 * 1. Authenticate as a moderator to establish authorization context
 * 2. Query restrictions with various date range filters:
 *
 *    - Filter for restrictions expiring within the next 3 days
 *    - Filter for restrictions expiring between 5-15 days from now
 *    - Filter for restrictions expiring between 20-40 days from now
 * 3. Test edge cases with partial filters:
 *
 *    - Filter with only expires_from parameter
 *    - Filter with only expires_to parameter
 * 4. Verify pagination works correctly with expiration range filters
 * 5. Validate response structure contains all required restriction fields
 * 6. Ensure returned restrictions have expires_at within specified ranges
 */
export async function test_api_moderation_restrictions_filter_by_expiration_range(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(8) + "Aa1!",
        username: RandomGenerator.alphabets(10),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Generate test date references for filtering
  const now = new Date();
  const threeDaysLater = new Date(
    now.getTime() + 3 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const fiveDaysLater = new Date(
    now.getTime() + 5 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const fifteenDaysLater = new Date(
    now.getTime() + 15 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const twentyDaysLater = new Date(
    now.getTime() + 20 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const fortyDaysLater = new Date(
    now.getTime() + 40 * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Step 2: Test Case 1 - Filter for restrictions expiring within the next 3 days
  const result1: IPageIDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.moderation.restrictions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          expires_from: now.toISOString(),
          expires_to: threeDaysLater,
        } satisfies IDiscussionBoardAccountRestriction.IRequest,
      },
    );
  typia.assert(result1);

  // Validate response structure
  TestValidator.predicate(
    "result has pagination info",
    result1.pagination !== undefined &&
      result1.pagination.current >= 1 &&
      result1.pagination.limit > 0,
  );

  TestValidator.predicate("result has data array", Array.isArray(result1.data));

  // Validate each restriction is within the specified expiration range
  result1.data.forEach((restriction) => {
    if (restriction.expires_at !== null) {
      const expiresAt = new Date(restriction.expires_at).getTime();
      const fromTime = now.getTime();
      const toTime = new Date(threeDaysLater).getTime();
      TestValidator.predicate(
        "restriction expires_at is within specified range (0-3 days)",
        expiresAt >= fromTime && expiresAt <= toTime,
      );
    }
  });

  // Step 3: Test Case 2 - Filter for restrictions expiring between 5-15 days
  const result2: IPageIDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.moderation.restrictions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          expires_from: fiveDaysLater,
          expires_to: fifteenDaysLater,
        } satisfies IDiscussionBoardAccountRestriction.IRequest,
      },
    );
  typia.assert(result2);

  // Validate restrictions in 5-15 day range
  result2.data.forEach((restriction) => {
    if (restriction.expires_at !== null) {
      const expiresAt = new Date(restriction.expires_at).getTime();
      const fromTime = new Date(fiveDaysLater).getTime();
      const toTime = new Date(fifteenDaysLater).getTime();
      TestValidator.predicate(
        "restriction expires_at is within specified range (5-15 days)",
        expiresAt >= fromTime && expiresAt <= toTime,
      );
    }
  });

  // Step 4: Test Case 3 - Filter for restrictions expiring between 20-40 days
  const result3: IPageIDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.moderation.restrictions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          expires_from: twentyDaysLater,
          expires_to: fortyDaysLater,
        } satisfies IDiscussionBoardAccountRestriction.IRequest,
      },
    );
  typia.assert(result3);

  // Validate restrictions in 20-40 day range
  result3.data.forEach((restriction) => {
    if (restriction.expires_at !== null) {
      const expiresAt = new Date(restriction.expires_at).getTime();
      const fromTime = new Date(twentyDaysLater).getTime();
      const toTime = new Date(fortyDaysLater).getTime();
      TestValidator.predicate(
        "restriction expires_at is within specified range (20-40 days)",
        expiresAt >= fromTime && expiresAt <= toTime,
      );
    }
  });

  // Step 5: Test Case 4 - Verify pagination works with expiration range filter
  const resultWithPagination: IPageIDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.moderation.restrictions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          expires_from: now.toISOString(),
          expires_to: threeDaysLater,
        } satisfies IDiscussionBoardAccountRestriction.IRequest,
      },
    );
  typia.assert(resultWithPagination);

  TestValidator.predicate(
    "pagination limit is applied correctly",
    resultWithPagination.data.length <= 10,
  );

  // Step 6: Test Case 5 - Filter with only expires_from parameter
  const resultWithOnlyFrom: IPageIDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.moderation.restrictions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          expires_from: fiveDaysLater,
        } satisfies IDiscussionBoardAccountRestriction.IRequest,
      },
    );
  typia.assert(resultWithOnlyFrom);

  // Validate restrictions expire on or after expires_from date
  resultWithOnlyFrom.data.forEach((restriction) => {
    if (restriction.expires_at !== null) {
      const expiresAt = new Date(restriction.expires_at).getTime();
      const fromTime = new Date(fiveDaysLater).getTime();
      TestValidator.predicate(
        "restriction expires_at is after expires_from date (partial filter)",
        expiresAt >= fromTime,
      );
    }
  });

  // Step 7: Test Case 6 - Filter with only expires_to parameter
  const resultWithOnlyTo: IPageIDiscussionBoardAccountRestriction =
    await api.functional.discussionBoard.moderator.moderation.restrictions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          expires_to: fifteenDaysLater,
        } satisfies IDiscussionBoardAccountRestriction.IRequest,
      },
    );
  typia.assert(resultWithOnlyTo);

  // Validate restrictions expire on or before expires_to date
  resultWithOnlyTo.data.forEach((restriction) => {
    if (restriction.expires_at !== null) {
      const expiresAt = new Date(restriction.expires_at).getTime();
      const toTime = new Date(fifteenDaysLater).getTime();
      TestValidator.predicate(
        "restriction expires_at is before expires_to date (partial filter)",
        expiresAt <= toTime,
      );
    }
  });

  // Step 8: Verify response structure contains all required fields
  if (result1.data.length > 0) {
    const sampleRestriction = result1.data[0];
    typia.assert<IDiscussionBoardAccountRestriction>(sampleRestriction);

    TestValidator.predicate(
      "restriction has valid id field",
      sampleRestriction.id !== undefined &&
        sampleRestriction.id !== null &&
        typeof sampleRestriction.id === "string",
    );

    TestValidator.predicate(
      "restriction has valid restriction_type",
      sampleRestriction.restriction_type !== undefined &&
        (sampleRestriction.restriction_type === "posting_restriction" ||
          sampleRestriction.restriction_type === "temporary_suspension" ||
          sampleRestriction.restriction_type === "permanent_ban"),
    );

    TestValidator.predicate(
      "restriction has reason field",
      sampleRestriction.reason !== undefined &&
        typeof sampleRestriction.reason === "string",
    );

    TestValidator.predicate(
      "restriction has imposed_at timestamp",
      sampleRestriction.imposed_at !== undefined &&
        typeof sampleRestriction.imposed_at === "string",
    );

    TestValidator.predicate(
      "restriction has contributor info",
      sampleRestriction.contributor !== undefined &&
        sampleRestriction.contributor.id !== undefined &&
        sampleRestriction.contributor.username !== undefined,
    );

    TestValidator.predicate(
      "restriction has imposed_by_moderator info",
      sampleRestriction.imposed_by_moderator !== undefined &&
        sampleRestriction.imposed_by_moderator.id !== undefined &&
        sampleRestriction.imposed_by_moderator.username !== undefined,
    );

    TestValidator.predicate(
      "restriction has valid status",
      sampleRestriction.status !== undefined &&
        (sampleRestriction.status === "active" ||
          sampleRestriction.status === "lifted" ||
          sampleRestriction.status === "expired"),
    );
  }
}
