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
 * Test filtering violation records by specific contributor to view complete
 * violation history.
 *
 * Moderator authenticates and requests violations filtered by contributor_id.
 * The system returns all violations recorded against that contributor, showing
 * their complete enforcement history. Validates all returned records reference
 * the specified contributor. This is critical for escalation decisions -
 * moderators assess violation patterns before restricting or suspending
 * accounts.
 *
 * Process:
 *
 * 1. Create and authenticate a new moderator account
 * 2. Generate a random contributor ID (UUID) to filter by
 * 3. Request violation records filtered by the specified contributor_id
 * 4. Validate pagination structure is present
 * 5. Validate all returned violation records reference the specified contributor
 * 6. Validate violation record structure contains all required fields
 * 7. Test with empty result set to ensure proper handling
 */
export async function test_api_violations_filter_by_contributor_id(
  connection: api.IConnection,
) {
  // 1. Create and authenticate moderator
  const moderatorCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password:
      RandomGenerator.alphabets(8).toUpperCase() +
      RandomGenerator.alphabets(8).toLowerCase() +
      RandomGenerator.alphaNumeric(2) +
      "!@#$%^&*"[Math.floor(Math.random() * 8)],
    username: RandomGenerator.alphaNumeric(10),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCreateData,
    });
  typia.assert(moderator);

  // 2. Generate a random contributor ID for filtering
  const targetContributorId = typia.random<string & tags.Format<"uuid">>();

  // 3. Request violation records filtered by the specified contributor_id
  const violationResponse: IPageIDiscussionBoardContentViolationRecord.ISummary =
    await api.functional.discussionBoard.moderator.moderation.violations.index(
      connection,
      {
        body: {
          contributor_id: targetContributorId,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardContentViolationRecord.IRequest,
      },
    );
  typia.assert(violationResponse);

  // 4. Validate pagination structure
  TestValidator.equals(
    "pagination object exists",
    typeof violationResponse.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page is valid",
    violationResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is valid",
    violationResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "total records count is valid",
    violationResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages count is valid",
    violationResponse.pagination.pages >= 0,
  );

  // 5. Validate all returned violation records reference the specified contributor
  if (violationResponse.data.length > 0) {
    for (const violation of violationResponse.data) {
      typia.assert(violation);
      TestValidator.equals(
        "violation record has contributor reference matching filter",
        violation.contributor.id,
        targetContributorId,
      );
    }

    // 6. Validate violation record structure
    const firstViolation = violationResponse.data[0];
    TestValidator.predicate(
      "violation has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstViolation.id,
      ),
    );
    TestValidator.predicate(
      "violation type is string",
      typeof firstViolation.violation_type === "string",
    );
    TestValidator.predicate(
      "severity is string",
      typeof firstViolation.severity === "string",
    );
    TestValidator.predicate(
      "violation description is string",
      typeof firstViolation.violation_description === "string",
    );
    TestValidator.predicate(
      "action taken is string",
      typeof firstViolation.action_taken === "string",
    );
    TestValidator.predicate(
      "contributor object exists with id",
      typeof firstViolation.contributor.id === "string",
    );
    TestValidator.predicate(
      "contributor object exists with username",
      typeof firstViolation.contributor.username === "string",
    );
    TestValidator.predicate(
      "moderator object exists with id",
      typeof firstViolation.moderator.id === "string",
    );
    TestValidator.predicate(
      "moderator object exists with username",
      typeof firstViolation.moderator.username === "string",
    );
  }

  // 7. Test with different pagination parameters
  const secondPageResponse: IPageIDiscussionBoardContentViolationRecord.ISummary =
    await api.functional.discussionBoard.moderator.moderation.violations.index(
      connection,
      {
        body: {
          contributor_id: targetContributorId,
          page: 2,
          limit: 10,
        } satisfies IDiscussionBoardContentViolationRecord.IRequest,
      },
    );
  typia.assert(secondPageResponse);
  TestValidator.predicate(
    "second page request returns valid pagination",
    secondPageResponse.pagination.current >= 0,
  );

  // 8. Test filtering with different limit
  const limitedResponse: IPageIDiscussionBoardContentViolationRecord.ISummary =
    await api.functional.discussionBoard.moderator.moderation.violations.index(
      connection,
      {
        body: {
          contributor_id: targetContributorId,
          limit: 5,
        } satisfies IDiscussionBoardContentViolationRecord.IRequest,
      },
    );
  typia.assert(limitedResponse);
  TestValidator.predicate(
    "limited response respects limit parameter",
    limitedResponse.data.length <= 5,
  );
}
