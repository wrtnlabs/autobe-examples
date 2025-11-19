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
 * Test sorting violation records by detection date in ascending order.
 *
 * This test validates that the moderator can retrieve violation records sorted
 * by detection_date in ascending order (oldest first). The test authenticates a
 * moderator, then requests the violations list with order_by='detection_date'
 * and order_direction='asc'. The response should contain violations sorted
 * chronologically from earliest to latest detection times, enabling historical
 * pattern analysis.
 *
 * Process:
 *
 * 1. Create and authenticate a new moderator account with valid credentials
 * 2. Request violations list with detection_date sorting in ascending order
 * 3. Validate that returned violations are sorted by detected_at timestamp
 * 4. Verify each violation's detected_at timestamp is >= the previous one
 * 5. Confirm chronological ordering from oldest to newest detection
 */
export async function test_api_violations_sort_by_detection_date_ascending(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new moderator account with proper password complexity
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  // Generate password meeting complexity requirements: uppercase, lowercase, number, special character
  const moderatorPassword = "Pass" + RandomGenerator.alphaNumeric(4) + "@123";
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: RandomGenerator.alphabets(8),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Request violations with ascending sort by detection_date
  const violationResponse: IPageIDiscussionBoardContentViolationRecord.ISummary =
    await api.functional.discussionBoard.moderator.moderation.violations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          order_by: "detection_date",
          order_direction: "asc",
        } satisfies IDiscussionBoardContentViolationRecord.IRequest,
      },
    );
  typia.assert(violationResponse);

  // Step 3, 4, 5: Validate violations are sorted in ascending order by detected_at timestamp
  const violations = violationResponse.data;

  if (violations.length > 1) {
    // Validate chronological ordering for multiple violations
    for (let i = 1; i < violations.length; i++) {
      const previousViolation = violations[i - 1];
      const currentViolation = violations[i];

      const previousDate = new Date(previousViolation.detected_at).getTime();
      const currentDate = new Date(currentViolation.detected_at).getTime();

      TestValidator.predicate(
        `violation at index ${i} should have detected_at >= violation at index ${i - 1} in ascending order`,
        previousDate <= currentDate,
      );
    }
  }

  // Verify response structure and sorting parameters are valid
  TestValidator.predicate(
    "violation response should contain pagination data",
    violationResponse.pagination.current > 0 &&
      violationResponse.pagination.limit > 0,
  );
}
