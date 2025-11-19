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
 * Test filtering violation records by severity level (moderate).
 *
 * Validates that the violation filtering API correctly returns only violations
 * classified with 'moderate' severity level when the severity_level filter is
 * applied. This ensures moderators can focus their review efforts on clear
 * policy breaches that require substantive enforcement action, without being
 * overwhelmed by minor violations.
 *
 * Process:
 *
 * 1. Create and authenticate a new moderator account
 * 2. Request violation records filtered by severity_level='moderate'
 * 3. Verify all returned violations have severity='moderate'
 * 4. Validate pagination structure and data integrity
 */
export async function test_api_violations_filter_by_severity_moderate(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "Test@1234567";
  const moderatorUsername = RandomGenerator.alphaNumeric(10);

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator email matches",
    moderator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator username matches",
    moderator.username,
    moderatorUsername,
  );

  // Step 2: Request violations filtered by severity_level='moderate'
  const violationResponse: IPageIDiscussionBoardContentViolationRecord.ISummary =
    await api.functional.discussionBoard.moderator.moderation.violations.index(
      connection,
      {
        body: {
          severity_level: "moderate",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardContentViolationRecord.IRequest,
      },
    );
  typia.assert(violationResponse);

  // Step 3: Validate pagination structure
  TestValidator.predicate(
    "pagination object exists",
    violationResponse.pagination !== null &&
      violationResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is 1",
    violationResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is 20",
    violationResponse.pagination.limit === 20,
  );
  TestValidator.predicate(
    "total records is non-negative",
    violationResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    violationResponse.pagination.pages >= 0,
  );

  // Step 4: Validate all returned violations have severity='moderate'
  TestValidator.predicate(
    "data array exists",
    Array.isArray(violationResponse.data),
  );

  if (violationResponse.data.length > 0) {
    // Validate each violation record has severity='moderate'
    for (const violation of violationResponse.data) {
      typia.assert(violation);

      TestValidator.equals(
        "violation severity is moderate",
        violation.severity,
        "moderate",
      );

      TestValidator.predicate(
        "violation has id",
        violation.id !== null && violation.id !== undefined,
      );

      TestValidator.predicate(
        "violation has type",
        violation.violation_type !== null &&
          violation.violation_type !== undefined,
      );

      TestValidator.predicate(
        "violation has description",
        violation.violation_description !== null &&
          violation.violation_description !== undefined &&
          violation.violation_description.length > 0,
      );

      TestValidator.predicate(
        "violation has action taken",
        violation.action_taken !== null && violation.action_taken !== undefined,
      );

      TestValidator.predicate(
        "violation has detection timestamp",
        violation.detected_at !== null && violation.detected_at !== undefined,
      );

      TestValidator.predicate(
        "violation has contributor",
        violation.contributor !== null && violation.contributor !== undefined,
      );

      TestValidator.predicate(
        "violation has moderator",
        violation.moderator !== null && violation.moderator !== undefined,
      );

      TestValidator.predicate(
        "violation has creation timestamp",
        violation.created_at !== null && violation.created_at !== undefined,
      );
    }
  }
}
