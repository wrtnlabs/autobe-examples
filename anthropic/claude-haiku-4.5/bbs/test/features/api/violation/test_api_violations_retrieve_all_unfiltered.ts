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
 * Retrieve the complete violation records without any filters.
 *
 * Test validates that moderators can retrieve all content policy violations
 * recorded in the system. The moderator authenticates, then requests all
 * violations without applying any filtering parameters. The API returns a
 * paginated list containing complete violation records with type, severity,
 * description, action taken, timestamps, and contributor/moderator summaries.
 *
 * Validates:
 *
 * 1. Moderator authentication and authorization
 * 2. Complete violation record retrieval without filters
 * 3. Pagination metadata correctness
 * 4. Violation details structure and content
 * 5. Contributor and moderator summary information
 */
export async function test_api_violations_retrieve_all_unfiltered(
  connection: api.IConnection,
) {
  // 1. Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword =
    RandomGenerator.alphabets(8) +
    RandomGenerator.alphabets(1).toUpperCase() +
    "1!";

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: RandomGenerator.alphabets(10),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  TestValidator.predicate(
    "moderator account created successfully",
    moderator.email === moderatorEmail,
  );

  // 2. Retrieve all violations without any filters
  const violationResponse: IPageIDiscussionBoardContentViolationRecord.ISummary =
    await api.functional.discussionBoard.moderator.moderation.violations.index(
      connection,
      {
        body: {} satisfies IDiscussionBoardContentViolationRecord.IRequest,
      },
    );
  typia.assert(violationResponse);

  // 3. Validate pagination metadata exists and is properly structured
  const pagination = violationResponse.pagination;
  TestValidator.predicate(
    "pagination metadata is complete",
    pagination.current !== undefined &&
      pagination.limit !== undefined &&
      pagination.records !== undefined &&
      pagination.pages !== undefined,
  );

  TestValidator.predicate(
    "pagination current page is non-negative",
    pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination pages matches record count and limit",
    pagination.pages ===
      Math.ceil(pagination.records / (pagination.limit || 1)) ||
      pagination.records === 0,
  );

  // 4. Validate violation data array structure
  TestValidator.predicate(
    "violation data is array",
    Array.isArray(violationResponse.data),
  );

  // 5. If violations exist, validate sample violation record
  if (violationResponse.data.length > 0) {
    const violation = violationResponse.data[0];

    // Validate violation has required fields (already checked by typia.assert)
    TestValidator.predicate(
      "violation record has complete information",
      violation.id !== undefined &&
        violation.violation_type !== undefined &&
        violation.severity !== undefined &&
        violation.violation_description !== undefined &&
        violation.action_taken !== undefined &&
        violation.detected_at !== undefined &&
        violation.created_at !== undefined &&
        violation.contributor !== undefined &&
        violation.moderator !== undefined,
    );

    // Validate contributor reference
    TestValidator.predicate(
      "violation contributor summary is valid",
      violation.contributor.id !== undefined &&
        violation.contributor.username !== undefined &&
        violation.contributor.username.length > 0,
    );

    // Validate moderator reference
    TestValidator.predicate(
      "violation moderator summary is valid",
      violation.moderator.id !== undefined &&
        violation.moderator.username !== undefined &&
        violation.moderator.username.length > 0,
    );

    // Validate temporal consistency - detected_at should be before or equal to created_at
    const detectedTime = new Date(violation.detected_at).getTime();
    const createdTime = new Date(violation.created_at).getTime();
    TestValidator.predicate(
      "violation timestamps are chronologically consistent",
      detectedTime <= createdTime,
    );
  }
}
