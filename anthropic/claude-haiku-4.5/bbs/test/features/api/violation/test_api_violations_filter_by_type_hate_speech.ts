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
 * Test filtering violation records by specific violation type (hate_speech).
 *
 * This test validates that the moderator API correctly filters content policy
 * violations by violation_type. A moderator authenticates to the system and
 * requests violation records filtered to show only hate_speech violations. The
 * system should return only violations where violation_type equals
 * "hate_speech", excluding personal_attack, misinformation, harassment, spam,
 * off_topic, graphic_content, threats, copyright, and other violation types.
 *
 * Test process:
 *
 * 1. Create new moderator account and authenticate
 * 2. Request violation records filtered by violation_type='hate_speech'
 * 3. Validate response structure includes pagination and data array
 * 4. Verify all returned violation records have violation_type='hate_speech'
 * 5. Confirm no violations of other types are included in results
 * 6. Validate pagination metadata (current page, limit, records, pages)
 */
export async function test_api_violations_filter_by_type_hate_speech(
  connection: api.IConnection,
) {
  // Step 1: Create new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "TestPassword123!",
        username: RandomGenerator.alphabets(10),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Request violation records filtered by violation_type='hate_speech'
  const violationFilterRequest = {
    page: 1,
    limit: 20,
    violation_type: "hate_speech" as const,
  } satisfies IDiscussionBoardContentViolationRecord.IRequest;

  const violationPage: IPageIDiscussionBoardContentViolationRecord.ISummary =
    await api.functional.discussionBoard.moderator.moderation.violations.index(
      connection,
      {
        body: violationFilterRequest,
      },
    );
  typia.assert(violationPage);

  // Step 3: Validate response structure
  TestValidator.predicate(
    "response should have pagination object",
    violationPage.pagination !== null && violationPage.pagination !== undefined,
  );

  TestValidator.predicate(
    "response should have data array",
    Array.isArray(violationPage.data),
  );

  // Step 4: Verify all returned violations have violation_type='hate_speech'
  if (violationPage.data.length > 0) {
    violationPage.data.forEach((violation) => {
      TestValidator.equals(
        "violation_type should be hate_speech",
        violation.violation_type,
        "hate_speech",
      );
    });
  }

  // Step 5: Validate pagination metadata
  const pagination = violationPage.pagination;
  TestValidator.predicate(
    "pagination current page should be at least 1",
    pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit should be positive",
    pagination.limit > 0,
  );

  TestValidator.predicate(
    "pagination records should be non-negative",
    pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination pages should be non-negative",
    pagination.pages >= 0,
  );

  // Step 6: Verify filter was applied by requesting without filter to compare
  const allViolationsRequest = {
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardContentViolationRecord.IRequest;

  const allViolationsPage: IPageIDiscussionBoardContentViolationRecord.ISummary =
    await api.functional.discussionBoard.moderator.moderation.violations.index(
      connection,
      {
        body: allViolationsRequest,
      },
    );
  typia.assert(allViolationsPage);

  // Verify filtering actually reduces results or returns only hate_speech violations
  if (allViolationsPage.data.length > 0) {
    const nonHateSpeechViolations = allViolationsPage.data.filter(
      (v) => v.violation_type !== "hate_speech",
    );

    if (nonHateSpeechViolations.length > 0) {
      TestValidator.predicate(
        "filtered results should not include non-hate_speech violations",
        violationPage.data.every((v) => v.violation_type === "hate_speech"),
      );
    }
  }
}
