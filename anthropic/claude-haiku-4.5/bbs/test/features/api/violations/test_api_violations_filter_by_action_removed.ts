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
 * Test filtering violation records by enforcement action taken (removed).
 *
 * Validates that the moderation violations API correctly filters and returns
 * only violation records where the enforcement action taken was 'removed'
 * (content was deleted from the platform). This test ensures moderators can
 * track enforcement consistency for removed content violations.
 *
 * Workflow:
 *
 * 1. Create and authenticate a new moderator account
 * 2. Request violation records filtered by action_taken='removed'
 * 3. Validate all returned records have action_taken='removed'
 * 4. Verify pagination information is correct
 * 5. Confirm response structure matches expected schema
 */
export async function test_api_violations_filter_by_action_removed(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    username: RandomGenerator.alphabets(10),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Query violation records filtered by action_taken='removed'
  const violationRequest = {
    page: 1,
    limit: 20,
    action_taken: "removed" as const,
  } satisfies IDiscussionBoardContentViolationRecord.IRequest;

  const violationResponse: IPageIDiscussionBoardContentViolationRecord.ISummary =
    await api.functional.discussionBoard.moderator.moderation.violations.index(
      connection,
      {
        body: violationRequest,
      },
    );
  typia.assert(violationResponse);

  // Step 3: Validate all returned records have action_taken='removed'
  if (violationResponse.data.length > 0) {
    for (const violation of violationResponse.data) {
      TestValidator.equals(
        "violation action_taken should be 'removed'",
        violation.action_taken,
        "removed",
      );
    }
  }

  // Step 4: Verify pagination information is correct
  TestValidator.predicate(
    "pagination current page should be 1",
    violationResponse.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit should be 20",
    violationResponse.pagination.limit === 20,
  );

  TestValidator.predicate(
    "pagination records should be non-negative",
    violationResponse.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination pages should be non-negative",
    violationResponse.pagination.pages >= 0,
  );

  // Step 5: Confirm response structure and data integrity
  TestValidator.predicate(
    "violation data array should be defined",
    Array.isArray(violationResponse.data),
  );

  // Validate each violation record has required fields
  for (const violation of violationResponse.data) {
    TestValidator.predicate(
      "violation should have id",
      violation.id !== undefined && violation.id !== null,
    );

    TestValidator.predicate(
      "violation should have violation_type",
      violation.violation_type !== undefined &&
        violation.violation_type !== null,
    );

    TestValidator.predicate(
      "violation should have severity",
      violation.severity !== undefined && violation.severity !== null,
    );

    TestValidator.predicate(
      "violation should have violation_description",
      violation.violation_description !== undefined &&
        violation.violation_description !== null,
    );

    TestValidator.predicate(
      "violation should have contributor",
      violation.contributor !== undefined && violation.contributor !== null,
    );

    TestValidator.predicate(
      "violation should have moderator",
      violation.moderator !== undefined && violation.moderator !== null,
    );

    TestValidator.predicate(
      "violation should have detected_at",
      violation.detected_at !== undefined && violation.detected_at !== null,
    );

    TestValidator.predicate(
      "violation should have created_at",
      violation.created_at !== undefined && violation.created_at !== null,
    );
  }
}
