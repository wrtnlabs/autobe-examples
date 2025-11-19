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
 * Validates severity-level descending sort order for content violation records.
 *
 * Tests that moderators can retrieve violation records sorted by severity level
 * in descending order (most severe first). This is critical for moderation
 * workflows where moderators need to prioritize review of serious violations
 * like hate speech and threats before addressing minor issues.
 *
 * The test flow:
 *
 * 1. Create a new moderator account through registration
 * 2. Request violation records with explicit severity_level descending sort
 * 3. Validate that returned violations are properly ordered: severe → moderate →
 *    minor
 * 4. Verify pagination metadata is accurate
 * 5. Confirm no violations exist or ordering is correct when data is present
 */
export async function test_api_violations_sort_by_severity_descending(
  connection: api.IConnection,
) {
  // Step 1: Register new moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorUsername: string = RandomGenerator.alphabets(10);
  const moderatorPassword: string = `SecurePass${RandomGenerator.alphaNumeric(8)}!`;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Request violations sorted by severity_level descending
  const violationsResponse: IPageIDiscussionBoardContentViolationRecord.ISummary =
    await api.functional.discussionBoard.moderator.moderation.violations.index(
      connection,
      {
        body: {
          order_by: "severity_level",
          order_direction: "desc",
        } satisfies IDiscussionBoardContentViolationRecord.IRequest,
      },
    );
  typia.assert(violationsResponse);

  // Step 3: Validate pagination structure
  TestValidator.predicate(
    "pagination object exists",
    violationsResponse.pagination !== null &&
      violationsResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(violationsResponse.data),
  );

  // Step 4: Validate severity ordering if violations are present
  if (violationsResponse.data.length > 0) {
    // Map severity levels to numeric values for comparison
    const severityRank = (severity: string): number => {
      if (severity === "severe") return 3;
      if (severity === "moderate") return 2;
      if (severity === "minor") return 1;
      return 0;
    };

    // Verify descending order: each violation should have severity >= next violation
    for (let i = 0; i < violationsResponse.data.length - 1; i++) {
      const currentSeverity = severityRank(violationsResponse.data[i].severity);
      const nextSeverity = severityRank(
        violationsResponse.data[i + 1].severity,
      );

      TestValidator.predicate(
        `violation ${i} severity (${violationsResponse.data[i].severity}) should be >= violation ${i + 1} severity (${violationsResponse.data[i + 1].severity})`,
        currentSeverity >= nextSeverity,
      );
    }

    // Step 5: Verify first violation is most severe if severe violations exist
    const hasSevereViolations = violationsResponse.data.some(
      (v) => v.severity === "severe",
    );
    if (hasSevereViolations) {
      TestValidator.predicate(
        "first violation should be severe when severe violations exist",
        violationsResponse.data[0].severity === "severe",
      );
    }

    // Step 6: Validate violation record structure
    const firstViolation = violationsResponse.data[0];
    TestValidator.predicate(
      "violation has id",
      firstViolation.id !== undefined && firstViolation.id !== null,
    );
    TestValidator.predicate(
      "violation has violation_type",
      firstViolation.violation_type !== undefined &&
        firstViolation.violation_type !== null,
    );
    TestValidator.predicate(
      "violation has severity",
      ["minor", "moderate", "severe"].includes(firstViolation.severity),
    );
    TestValidator.predicate(
      "violation has action_taken",
      firstViolation.action_taken !== undefined &&
        firstViolation.action_taken !== null,
    );
    TestValidator.predicate(
      "violation has contributor",
      firstViolation.contributor !== undefined &&
        firstViolation.contributor !== null,
    );
    TestValidator.predicate(
      "violation has moderator",
      firstViolation.moderator !== undefined &&
        firstViolation.moderator !== null,
    );
  }

  // Step 7: Verify pagination values
  TestValidator.predicate(
    "current page is non-negative",
    violationsResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is positive",
    violationsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    violationsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    violationsResponse.pagination.pages >= 0,
  );

  // Step 8: Test with explicit pagination parameters
  const paginatedResponse: IPageIDiscussionBoardContentViolationRecord.ISummary =
    await api.functional.discussionBoard.moderator.moderation.violations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          order_by: "severity_level",
          order_direction: "desc",
        } satisfies IDiscussionBoardContentViolationRecord.IRequest,
      },
    );
  typia.assert(paginatedResponse);

  TestValidator.equals(
    "paginated response current page",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "paginated response limit",
    paginatedResponse.pagination.limit,
    10,
  );
}
