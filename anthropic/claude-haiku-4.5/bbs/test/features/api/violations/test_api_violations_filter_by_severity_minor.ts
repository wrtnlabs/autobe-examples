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
 * Test filtering violation records by severity level (minor).
 *
 * This test validates the moderator's ability to filter and retrieve only
 * minor-severity violations from the discussion board moderation system.
 *
 * Workflow:
 *
 * 1. Create a moderator account and authenticate
 * 2. Request violation records filtered by severity_level='minor'
 * 3. Validate that all returned violation records have severity='minor'
 * 4. Confirm the filter correctly returns only lower-severity violations
 */
export async function test_api_violations_filter_by_severity_minor(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = `Pwd${RandomGenerator.alphaNumeric(8)}!`;
  const moderatorUsername = RandomGenerator.alphaNumeric(8);

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
    "moderator created with correct email",
    moderator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator username matches input",
    moderator.username,
    moderatorUsername,
  );

  // Step 2: Request violations filtered by severity_level='minor'
  const violationResponse: IPageIDiscussionBoardContentViolationRecord.ISummary =
    await api.functional.discussionBoard.moderator.moderation.violations.index(
      connection,
      {
        body: {
          severity_level: "minor",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardContentViolationRecord.IRequest,
      },
    );
  typia.assert(violationResponse);

  // Step 3: Validate pagination structure
  TestValidator.predicate(
    "pagination has valid current page",
    violationResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    violationResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has valid total records",
    violationResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid total pages",
    violationResponse.pagination.pages >= 0,
  );

  // Step 4: Validate all returned violations have severity='minor'
  if (violationResponse.data.length > 0) {
    for (const violation of violationResponse.data) {
      TestValidator.equals(
        "violation severity is minor",
        violation.severity,
        "minor",
      );

      // Additional validations to ensure violation structure is correct
      TestValidator.predicate(
        "violation has valid id",
        violation.id.length > 0,
      );
      TestValidator.predicate(
        "violation has violation_type",
        violation.violation_type.length > 0,
      );
      TestValidator.predicate(
        "violation has action_taken",
        violation.action_taken.length > 0,
      );
      TestValidator.predicate(
        "violation has contributor",
        violation.contributor !== null && violation.contributor !== undefined,
      );
      TestValidator.predicate(
        "violation has moderator",
        violation.moderator !== null && violation.moderator !== undefined,
      );
    }

    TestValidator.predicate(
      "all returned violations filtered by minor severity",
      violationResponse.data.every((v) => v.severity === "minor"),
    );
  }

  // Step 5: Test with pagination parameters
  const pagedResponse: IPageIDiscussionBoardContentViolationRecord.ISummary =
    await api.functional.discussionBoard.moderator.moderation.violations.index(
      connection,
      {
        body: {
          severity_level: "minor",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardContentViolationRecord.IRequest,
      },
    );
  typia.assert(pagedResponse);

  TestValidator.predicate(
    "pagination limit respects request",
    pagedResponse.data.length <= 5,
  );
}
