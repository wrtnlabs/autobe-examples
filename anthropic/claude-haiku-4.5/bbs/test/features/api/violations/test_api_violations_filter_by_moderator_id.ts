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
 * Test filtering violation records by specific moderator ID for performance
 * analysis.
 *
 * This test validates the ability to retrieve and filter content policy
 * violations by a specific moderator's ID. The workflow authenticates a
 * moderator account, then queries the violation records endpoint with a
 * moderator_id filter parameter. The system returns all violations documented
 * by that moderator in a paginated response.
 *
 * The test verifies:
 *
 * 1. Moderator account creation and authentication succeeds
 * 2. Violation query with moderator_id filter returns valid paginated results
 * 3. All returned violation records correctly reference the specified moderator
 * 4. Response structure includes proper pagination metadata
 * 5. Each violation record contains required fields (type, severity, action,
 *    timestamps)
 *
 * Process:
 *
 * 1. Create new moderator account with email, password, and username
 * 2. Authenticate moderator and receive JWT access token
 * 3. Request violation records filtered by the moderator's ID
 * 4. Validate response structure and pagination information
 * 5. Verify all returned records have moderator ID matching the filter parameter
 * 6. Confirm violation records contain complete moderation information
 */
export async function test_api_violations_filter_by_moderator_id(
  connection: api.IConnection,
) {
  // Step 1: Create new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!";
  const moderatorUsername = RandomGenerator.alphabets(8);

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  typia.assertGuard(moderator);

  // Step 2: Verify moderator was created with expected properties
  TestValidator.equals(
    "moderator email matches input",
    moderator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator username matches input",
    moderator.username,
    moderatorUsername,
  );
  TestValidator.predicate(
    "moderator authentication token is present",
    moderator.token !== null && moderator.token !== undefined,
  );

  // Step 3: Query violation records filtered by moderator ID
  const violationResponse: IPageIDiscussionBoardContentViolationRecord.ISummary =
    await api.functional.discussionBoard.moderator.moderation.violations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          moderator_id: moderator.id,
        } satisfies IDiscussionBoardContentViolationRecord.IRequest,
      },
    );
  typia.assert(violationResponse);

  // Step 4: Validate response structure
  TestValidator.predicate(
    "response contains pagination info",
    violationResponse.pagination !== null &&
      violationResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination has current page",
    violationResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    violationResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has total records",
    violationResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has total pages",
    violationResponse.pagination.pages >= 0,
  );

  // Step 5: Validate data array exists
  TestValidator.predicate(
    "response contains data array",
    Array.isArray(violationResponse.data),
  );

  // Step 6: If violations exist, verify each record references the specified moderator
  if (violationResponse.data && violationResponse.data.length > 0) {
    for (const violation of violationResponse.data) {
      typia.assert(violation);

      // Verify violation has moderator reference
      TestValidator.predicate(
        "violation record has moderator field",
        violation.moderator !== null && violation.moderator !== undefined,
      );

      // Verify moderator ID matches filter parameter
      TestValidator.equals(
        "violation moderator ID matches query filter",
        violation.moderator.id,
        moderator.id,
      );

      // Verify violation record contains required fields
      TestValidator.predicate(
        "violation has valid ID",
        typeof violation.id === "string" && violation.id.length > 0,
      );
      TestValidator.predicate(
        "violation has type",
        typeof violation.violation_type === "string" &&
          violation.violation_type.length > 0,
      );
      TestValidator.predicate(
        "violation has severity",
        typeof violation.severity === "string" && violation.severity.length > 0,
      );
      TestValidator.predicate(
        "violation has action taken",
        typeof violation.action_taken === "string" &&
          violation.action_taken.length > 0,
      );
      TestValidator.predicate(
        "violation has description",
        typeof violation.violation_description === "string" &&
          violation.violation_description.length > 0,
      );

      // Verify violation has contributor and moderator summaries
      TestValidator.predicate(
        "violation has contributor reference",
        violation.contributor !== null && violation.contributor !== undefined,
      );
      TestValidator.predicate(
        "contributor has ID",
        typeof violation.contributor.id === "string" &&
          violation.contributor.id.length > 0,
      );
      TestValidator.predicate(
        "contributor has username",
        typeof violation.contributor.username === "string" &&
          violation.contributor.username.length > 0,
      );

      // Verify timestamps
      TestValidator.predicate(
        "violation has detected_at timestamp",
        typeof violation.detected_at === "string" &&
          violation.detected_at.length > 0,
      );
      TestValidator.predicate(
        "violation has created_at timestamp",
        typeof violation.created_at === "string" &&
          violation.created_at.length > 0,
      );
    }
  }

  // Step 7: Test pagination with different page and limit parameters
  const secondPageResponse: IPageIDiscussionBoardContentViolationRecord.ISummary =
    await api.functional.discussionBoard.moderator.moderation.violations.index(
      connection,
      {
        body: {
          page: 2,
          limit: 10,
          moderator_id: moderator.id,
        } satisfies IDiscussionBoardContentViolationRecord.IRequest,
      },
    );
  typia.assert(secondPageResponse);

  // Verify pagination was applied correctly
  TestValidator.equals(
    "second page request has correct page number",
    secondPageResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page request has correct limit",
    secondPageResponse.pagination.limit,
    10,
  );

  // Step 8: Test with additional filter parameters
  const filteredResponse: IPageIDiscussionBoardContentViolationRecord.ISummary =
    await api.functional.discussionBoard.moderator.moderation.violations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          moderator_id: moderator.id,
          severity_level: "severe",
        } satisfies IDiscussionBoardContentViolationRecord.IRequest,
      },
    );
  typia.assert(filteredResponse);

  // Verify filtered response structure is valid
  TestValidator.predicate(
    "filtered response contains valid pagination",
    filteredResponse.pagination.current >= 0 &&
      filteredResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "filtered response contains data array",
    Array.isArray(filteredResponse.data),
  );

  // If filtered results exist, verify severity filter was applied
  if (filteredResponse.data && filteredResponse.data.length > 0) {
    for (const violation of filteredResponse.data) {
      TestValidator.equals(
        "violation matches severity filter",
        violation.severity,
        "severe",
      );
      TestValidator.equals(
        "violation still references correct moderator",
        violation.moderator.id,
        moderator.id,
      );
    }
  }
}
