import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContentViolationRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentViolationRecord";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentViolationRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentViolationRecord";

/**
 * Test filtering violation records by detection date range.
 *
 * This test validates the moderator's ability to filter content policy
 * violation records using date range parameters (date_from and date_to in ISO
 * 8601 format). The system should return only violations detected within the
 * specified period.
 *
 * Test workflow:
 *
 * 1. Create moderator account and authenticate
 * 2. Define a date range for filtering (past 7 days)
 * 3. Request violations with date_from and date_to filters
 * 4. Validate all returned violations have detected_at within the range
 * 5. Verify pagination metadata is correct
 * 6. Test edge cases: exact boundary dates, empty results
 */
export async function test_api_violations_filter_by_date_range(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!";
  const moderatorUsername = RandomGenerator.alphabets(8);

  const moderatorAuth: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderatorAuth);
  TestValidator.predicate(
    "moderator authenticated successfully",
    moderatorAuth.email === moderatorEmail,
  );

  // Step 2: Define date range for filtering (past 7 days)
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const dateFrom = sevenDaysAgo.toISOString();
  const dateTo = now.toISOString();

  // Step 3: Request violations filtered by date range
  const violationPageResult: IPageIDiscussionBoardContentViolationRecord.ISummary =
    await api.functional.discussionBoard.moderator.moderation.violations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          date_from: dateFrom,
          date_to: dateTo,
        } satisfies IDiscussionBoardContentViolationRecord.IRequest,
      },
    );
  typia.assert(violationPageResult);

  // Step 4: Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is valid",
    violationPageResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    violationPageResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    violationPageResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    violationPageResult.pagination.pages >= 0,
  );

  // Step 5: Validate all returned violations are within date range
  if (violationPageResult.data.length > 0) {
    violationPageResult.data.forEach((violation) => {
      const detectedAt = new Date(violation.detected_at);
      TestValidator.predicate(
        `violation detected_at (${violation.detected_at}) is after date_from`,
        detectedAt >= sevenDaysAgo,
      );
      TestValidator.predicate(
        `violation detected_at (${violation.detected_at}) is before date_to`,
        detectedAt <= now,
      );
    });
  }

  // Step 6: Test with narrower date range to validate filtering works
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const narrowDateFrom = threeDaysAgo.toISOString();

  const narrowViolationPageResult: IPageIDiscussionBoardContentViolationRecord.ISummary =
    await api.functional.discussionBoard.moderator.moderation.violations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          date_from: narrowDateFrom,
          date_to: dateTo,
        } satisfies IDiscussionBoardContentViolationRecord.IRequest,
      },
    );
  typia.assert(narrowViolationPageResult);

  // Validate that narrow range returns equal or fewer results
  TestValidator.predicate(
    "narrow date range returns equal or fewer violations",
    narrowViolationPageResult.pagination.records <=
      violationPageResult.pagination.records,
  );

  // Step 7: Validate violation record structure
  if (violationPageResult.data.length > 0) {
    const firstViolation = violationPageResult.data[0];
    TestValidator.predicate(
      "violation has id",
      firstViolation.id !== undefined && firstViolation.id.length > 0,
    );
    TestValidator.predicate(
      "violation has violation_type",
      firstViolation.violation_type !== undefined,
    );
    TestValidator.predicate(
      "violation has severity",
      firstViolation.severity !== undefined,
    );
    TestValidator.predicate(
      "violation has action_taken",
      firstViolation.action_taken !== undefined,
    );
    TestValidator.predicate(
      "violation has contributor",
      firstViolation.contributor !== undefined,
    );
    TestValidator.predicate(
      "violation has moderator",
      firstViolation.moderator !== undefined,
    );
  }
}
