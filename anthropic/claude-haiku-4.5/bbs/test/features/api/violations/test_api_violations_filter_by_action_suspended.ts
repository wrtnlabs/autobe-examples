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
 * Test filtering violation records by enforcement action (suspended).
 *
 * Moderator authenticates and requests violations filtered by
 * action_taken='suspended'. The system returns only violations resulting in
 * account suspension.
 *
 * Workflow:
 *
 * 1. Moderator creates new account and authenticates
 * 2. Request violation records filtered by action_taken='suspended'
 * 3. Validate all returned records have action_taken='suspended'
 * 4. Verify pagination information is present
 * 5. Confirm violation records contain complete information
 */
export async function test_api_violations_filter_by_action_suspended(
  connection: api.IConnection,
) {
  // Step 1: Moderator authenticates
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorUsername: string = RandomGenerator.alphaNumeric(8);
  const moderatorPassword: string = `TestPass${RandomGenerator.alphaNumeric(4)}!`;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Request violation records filtered by action_taken='suspended'
  const violationResponse: IPageIDiscussionBoardContentViolationRecord.ISummary =
    await api.functional.discussionBoard.moderator.moderation.violations.index(
      connection,
      {
        body: {
          action_taken: "suspended",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardContentViolationRecord.IRequest,
      },
    );
  typia.assert(violationResponse);

  // Step 3: Validate pagination information
  TestValidator.predicate(
    "pagination should have current page",
    violationResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination should have positive limit",
    violationResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination should have non-negative total records",
    violationResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have non-negative total pages",
    violationResponse.pagination.pages >= 0,
  );

  // Step 4: Validate all returned violation records have action_taken='suspended'
  TestValidator.predicate(
    "should return array of violation records",
    Array.isArray(violationResponse.data),
  );

  if (violationResponse.data.length > 0) {
    // Validate each violation record
    await ArrayUtil.asyncForEach(violationResponse.data, async (violation) => {
      // Verify action_taken is 'suspended'
      TestValidator.equals(
        "violation action_taken should be 'suspended'",
        violation.action_taken,
        "suspended",
      );

      // Verify all required fields are present
      TestValidator.predicate(
        "violation should have valid id",
        violation.id !== null &&
          violation.id !== undefined &&
          violation.id.length > 0,
      );

      TestValidator.predicate(
        "violation should have violation_type",
        violation.violation_type !== null &&
          violation.violation_type !== undefined,
      );

      TestValidator.predicate(
        "violation should have severity",
        violation.severity !== null && violation.severity !== undefined,
      );

      TestValidator.predicate(
        "violation should have violation_description",
        violation.violation_description !== null &&
          violation.violation_description !== undefined &&
          violation.violation_description.length > 0,
      );

      TestValidator.predicate(
        "violation should have contributor information",
        violation.contributor !== null && violation.contributor !== undefined,
      );

      TestValidator.predicate(
        "violation should have moderator information",
        violation.moderator !== null && violation.moderator !== undefined,
      );

      TestValidator.predicate(
        "violation should have detected_at timestamp",
        violation.detected_at !== null && violation.detected_at !== undefined,
      );

      TestValidator.predicate(
        "violation should have created_at timestamp",
        violation.created_at !== null && violation.created_at !== undefined,
      );
    });

    // If we have violations, verify they are actual 'suspended' actions
    TestValidator.predicate(
      "all violations should have action_taken='suspended'",
      violationResponse.data.every((v) => v.action_taken === "suspended"),
    );
  }

  // Step 5: Test filtering with different pagination parameters
  const secondPage: IPageIDiscussionBoardContentViolationRecord.ISummary =
    await api.functional.discussionBoard.moderator.moderation.violations.index(
      connection,
      {
        body: {
          action_taken: "suspended",
          page: 2,
          limit: 10,
        } satisfies IDiscussionBoardContentViolationRecord.IRequest,
      },
    );
  typia.assert(secondPage);

  TestValidator.equals(
    "second page request should return paginated response",
    secondPage.pagination.limit,
    10,
  );
}
