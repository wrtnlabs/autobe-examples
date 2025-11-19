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
 * Test filtering violation records for recent violations only.
 *
 * This test validates that moderators can filter violation records by a recent
 * date using the date_from parameter. When a moderator authenticates and
 * requests violations with date_from set to a recent date and date_to omitted,
 * the system should return all violations detected on or after that date.
 *
 * The test verifies:
 *
 * 1. Moderator authentication and account creation
 * 2. Filtering violations with date_from parameter set to recent timestamp
 * 3. Pagination and result structure validation
 * 4. All returned violations have detected_at >= date_from
 * 5. No upper bound filtering when date_to is omitted
 */
export async function test_api_violations_filter_by_date_from_recent(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!@#";
  const moderatorUsername = RandomGenerator.alphaNumeric(8);

  const authenticatedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(authenticatedModerator);

  // Step 2: Set up date filtering - use a date from 30 days ago
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateFromFilter = thirtyDaysAgo.toISOString();

  // Step 3: Request violation records filtered by date_from with no date_to
  const violationResponse: IPageIDiscussionBoardContentViolationRecord.ISummary =
    await api.functional.discussionBoard.moderator.moderation.violations.index(
      connection,
      {
        body: {
          date_from: dateFromFilter,
          // date_to is intentionally omitted to test open-ended filtering
        } satisfies IDiscussionBoardContentViolationRecord.IRequest,
      },
    );
  typia.assert(violationResponse);

  // Step 4: Validate pagination structure
  TestValidator.predicate(
    "pagination should have valid structure",
    () =>
      violationResponse.pagination.current >= 0 &&
      violationResponse.pagination.limit >= 0 &&
      violationResponse.pagination.records >= 0 &&
      violationResponse.pagination.pages >= 0,
  );

  // Step 5: Validate data array exists
  TestValidator.predicate("violation data should be an array", () =>
    Array.isArray(violationResponse.data),
  );

  // Step 6: For each violation returned, verify structure and detected_at >= date_from
  const filterTimeMs = new Date(dateFromFilter).getTime();

  violationResponse.data.forEach((violation) => {
    typia.assert(violation);

    const violationDetectedTimeMs = new Date(violation.detected_at).getTime();
    TestValidator.predicate(
      `violation detected_at should be >= date_from`,
      () => violationDetectedTimeMs >= filterTimeMs,
    );

    // Verify violation record has required structure
    TestValidator.predicate(
      `violation should have complete structure with contributor and moderator`,
      () =>
        violation.contributor !== undefined &&
        violation.contributor !== null &&
        violation.contributor.id !== undefined &&
        violation.contributor.username !== undefined &&
        violation.moderator !== undefined &&
        violation.moderator !== null &&
        violation.moderator.id !== undefined &&
        violation.moderator.username !== undefined &&
        violation.violation_type !== undefined &&
        violation.severity !== undefined &&
        violation.action_taken !== undefined,
    );
  });

  // Step 7: Validate all violations meet the date filter criteria
  TestValidator.predicate(
    "all returned violations should have detected_at >= date_from",
    () =>
      violationResponse.data.every((violation) => {
        const violationTime = new Date(violation.detected_at).getTime();
        return violationTime >= filterTimeMs;
      }),
  );

  // Step 8: Verify pagination consistency
  TestValidator.predicate(
    "current page data length should not exceed limit",
    () => violationResponse.data.length <= violationResponse.pagination.limit,
  );
}
