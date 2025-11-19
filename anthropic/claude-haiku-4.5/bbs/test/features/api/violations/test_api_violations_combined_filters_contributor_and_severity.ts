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
 * Test violation records with combined filters for contributor and severity.
 *
 * This test validates that violation filtering works correctly when multiple
 * filters are applied simultaneously. A moderator authenticates and requests
 * violation records filtered by both contributor_id (a specific contributor)
 * AND severity_level='severe'. The system should return only violations that
 * match BOTH filter criteria, demonstrating AND logic (intersection) rather
 * than OR logic.
 *
 * Test process:
 *
 * 1. Register a new moderator account for authentication
 * 2. Query violation records with combined filters:
 *
 *    - Contributor_id: specific UUID
 *    - Severity_level: 'severe'
 * 3. Validate response structure and pagination
 * 4. If violations exist, confirm all match BOTH filter criteria
 * 5. Verify AND logic applies (not OR logic)
 */
export async function test_api_violations_combined_filters_contributor_and_severity(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
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

  // Step 2: Create test parameters for combined filtering
  const testContributorId = typia.random<string & tags.Format<"uuid">>();
  const testSeverityLevel: "minor" | "moderate" | "severe" = "severe";

  // Step 3: Query violation records with combined filters (contributor AND severity)
  const response: IPageIDiscussionBoardContentViolationRecord.ISummary =
    await api.functional.discussionBoard.moderator.moderation.violations.index(
      connection,
      {
        body: {
          contributor_id: testContributorId,
          severity_level: testSeverityLevel,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardContentViolationRecord.IRequest,
      },
    );
  typia.assert(response);

  // Step 4: Validate response structure
  TestValidator.predicate(
    "response contains pagination metadata",
    response.pagination !== null && response.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination current page is non-negative",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination total records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination total pages is non-negative",
    response.pagination.pages >= 0,
  );

  // Step 5: Validate pagination consistency
  if (response.pagination.records === 0) {
    TestValidator.equals(
      "pagination pages should be 0 when records are empty",
      response.pagination.pages,
      0,
    );
  }

  // Step 6: Validate all returned violations match BOTH filter criteria (AND logic)
  TestValidator.predicate(
    "all violations match contributor filter",
    response.data.every(
      (violation) => violation.contributor.id === testContributorId,
    ),
  );
  TestValidator.predicate(
    "all violations match severity filter",
    response.data.every(
      (violation) => violation.severity === testSeverityLevel,
    ),
  );

  // Step 7: Verify AND logic explicitly - each violation must satisfy both conditions
  for (const violation of response.data) {
    TestValidator.predicate(
      "violation satisfies both filters: contributor AND severity=severe",
      violation.contributor.id === testContributorId &&
        violation.severity === testSeverityLevel,
    );
  }

  // Step 8: Verify response data structure
  TestValidator.predicate(
    "response data is an array",
    Array.isArray(response.data),
  );
  if (response.data.length > 0) {
    const firstViolation = response.data[0];
    TestValidator.predicate(
      "violation record has required fields",
      firstViolation.id !== undefined &&
        firstViolation.violation_type !== undefined &&
        firstViolation.severity !== undefined &&
        firstViolation.action_taken !== undefined &&
        firstViolation.contributor !== undefined &&
        firstViolation.moderator !== undefined &&
        firstViolation.detected_at !== undefined &&
        firstViolation.created_at !== undefined,
    );
  }
}
