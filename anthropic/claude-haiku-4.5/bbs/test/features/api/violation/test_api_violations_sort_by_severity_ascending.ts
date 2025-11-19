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
 * Test sorting violation records by severity level in ascending order.
 *
 * Validates that when a moderator requests violation records with
 * order_by='severity_level' and order_direction='asc', the API returns
 * violations sorted from minor severity through moderate to severe severity.
 * This supports moderators in reviewing minor violations first for cleanup of
 * less critical issues before addressing more serious violations.
 *
 * Test flow:
 *
 * 1. Create a moderator account via authentication
 * 2. Query violations with severity-level ascending sorting parameters
 * 3. Verify the response contains violations sorted by severity (minor → moderate
 *    → severe)
 * 4. Validate pagination information and violation record structure
 */
export async function test_api_violations_sort_by_severity_ascending(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPass123!",
    username: RandomGenerator.alphabets(10),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Request violations sorted by severity level ascending
  const violationRequest = {
    page: 1,
    limit: 50,
    order_by: "severity_level",
    order_direction: "asc",
  } satisfies IDiscussionBoardContentViolationRecord.IRequest;

  const violationPage: IPageIDiscussionBoardContentViolationRecord.ISummary =
    await api.functional.discussionBoard.moderator.moderation.violations.index(
      connection,
      {
        body: violationRequest,
      },
    );
  typia.assert(violationPage);

  // Step 3: Validate pagination information
  TestValidator.predicate(
    "pagination current page should be valid",
    violationPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    violationPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records should be non-negative",
    violationPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be non-negative",
    violationPage.pagination.pages >= 0,
  );

  // Step 4: Validate violation records structure and sorting
  if (violationPage.data.length > 0) {
    // Map severity levels to numeric values for comparison
    const severityOrder: Record<string, number> = {
      minor: 1,
      moderate: 2,
      severe: 3,
    };

    // Verify each violation record has required structure
    violationPage.data.forEach((violation) => {
      typia.assert(violation);
      TestValidator.predicate(
        "violation should have valid ID",
        violation.id !== undefined && violation.id !== null,
      );
      TestValidator.predicate(
        "violation should have type",
        violation.violation_type !== undefined &&
          violation.violation_type !== null,
      );
      TestValidator.predicate(
        "violation should have severity",
        violation.severity !== undefined && violation.severity !== null,
      );
      TestValidator.predicate(
        "violation should have description",
        violation.violation_description !== undefined,
      );
      TestValidator.predicate(
        "violation should have action taken",
        violation.action_taken !== undefined,
      );
      TestValidator.predicate(
        "violation should have detected_at timestamp",
        violation.detected_at !== undefined,
      );
      TestValidator.predicate(
        "violation should have contributor info",
        violation.contributor !== undefined &&
          violation.contributor.id !== undefined,
      );
      TestValidator.predicate(
        "violation should have moderator info",
        violation.moderator !== undefined &&
          violation.moderator.id !== undefined,
      );
    });

    // Verify sorting order: minor < moderate < severe
    for (let i = 0; i < violationPage.data.length - 1; i++) {
      const currentSeverity = violationPage.data[i].severity.toLowerCase();
      const nextSeverity = violationPage.data[i + 1].severity.toLowerCase();
      const currentOrder = severityOrder[currentSeverity] || 0;
      const nextOrder = severityOrder[nextSeverity] || 0;

      TestValidator.predicate(
        `severity at index ${i} should be less than or equal to severity at index ${i + 1}`,
        currentOrder <= nextOrder,
      );
    }
  }

  // Step 5: Verify moderator is properly authenticated
  TestValidator.equals(
    "moderator email should match input",
    moderator.email,
    moderatorData.email,
  );
  TestValidator.equals(
    "moderator username should match input",
    moderator.username,
    moderatorData.username,
  );
  TestValidator.predicate(
    "moderator should have active status",
    moderator.account_status === "active",
  );
  TestValidator.predicate(
    "moderator should have full moderation tier",
    moderator.moderation_tier === "full",
  );
}
