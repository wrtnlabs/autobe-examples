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
 * Test filtering violation records by misinformation violation type.
 *
 * This test validates the moderator's ability to query the violation database
 * with specific type filtering. A moderator account is created, authenticated,
 * and then used to request violations filtered by
 * violation_type='misinformation'. The system should return only violations
 * classified as misinformation, enabling moderators to identify and analyze
 * misinformation patterns across the platform.
 *
 * Process:
 *
 * 1. Create moderator account with unique credentials
 * 2. Authenticate moderator (automatic token assignment)
 * 3. Query violations filtered by violation_type='misinformation'
 * 4. Validate response contains paginated violation records
 * 5. Verify all returned records have violation_type='misinformation'
 */
export async function test_api_violations_filter_by_type_misinformation(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphabets(8) + "A1!";
  const moderatorUsername = RandomGenerator.alphabets(10);

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Authentication token is automatically set by SDK
  TestValidator.equals(
    "moderator authenticated",
    moderator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator username correct",
    moderator.username,
    moderatorUsername,
  );
  TestValidator.predicate(
    "moderator has access token",
    moderator.token.access.length > 0,
  );

  // Step 3: Query violations filtered by violation_type='misinformation'
  const violationsResponse: IPageIDiscussionBoardContentViolationRecord.ISummary =
    await api.functional.discussionBoard.moderator.moderation.violations.index(
      connection,
      {
        body: {
          violation_type: "misinformation",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardContentViolationRecord.IRequest,
      },
    );
  typia.assert(violationsResponse);

  // Step 4: Validate response structure
  TestValidator.predicate(
    "response has pagination data",
    violationsResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data array",
    Array.isArray(violationsResponse.data),
  );
  TestValidator.predicate(
    "pagination current page is valid",
    violationsResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    violationsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is valid",
    violationsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    violationsResponse.pagination.pages >= 0,
  );

  // Step 5: Verify all returned violations are misinformation type
  if (violationsResponse.data.length > 0) {
    for (const violation of violationsResponse.data) {
      TestValidator.equals(
        "violation type is misinformation",
        violation.violation_type,
        "misinformation",
      );
      TestValidator.predicate("violation has id", violation.id.length > 0);
      TestValidator.predicate(
        "violation has description",
        violation.violation_description.length > 0,
      );
      TestValidator.predicate(
        "violation has action taken",
        violation.action_taken.length > 0,
      );
      TestValidator.predicate(
        "violation has severity",
        violation.severity.length > 0,
      );
      TestValidator.predicate(
        "violation has contributor",
        violation.contributor !== undefined,
      );
      TestValidator.predicate(
        "violation has moderator",
        violation.moderator !== undefined,
      );
      TestValidator.predicate(
        "violation has detected_at",
        violation.detected_at.length > 0,
      );
      TestValidator.predicate(
        "violation has created_at",
        violation.created_at.length > 0,
      );
    }
  }

  // Step 6: Validate moderator information in violation records
  if (violationsResponse.data.length > 0) {
    const firstViolation = violationsResponse.data[0];
    TestValidator.equals(
      "moderator in violation matches authenticated moderator",
      firstViolation.moderator.id,
      moderator.id,
    );
  }
}
