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

export async function test_api_violations_complex_filter_type_severity_action(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePass123!",
        username: RandomGenerator.alphaNumeric(8),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Query violations with complex filter criteria
  // Filter by violation_type='misinformation', severity_level='severe', action_taken='reported_to_admin'
  const violationResponse: IPageIDiscussionBoardContentViolationRecord.ISummary =
    await api.functional.discussionBoard.moderator.moderation.violations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          violation_type: "misinformation",
          severity_level: "severe",
          action_taken: "reported_to_admin",
        } satisfies IDiscussionBoardContentViolationRecord.IRequest,
      },
    );
  typia.assert(violationResponse);

  // Step 3: Validate pagination structure
  TestValidator.predicate(
    "pagination object exists",
    violationResponse.pagination !== null &&
      violationResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is positive",
    violationResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is positive",
    violationResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "total records is non-negative",
    violationResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    violationResponse.pagination.pages >= 0,
  );

  // Step 4: Validate all returned violations match filter criteria
  if (violationResponse.data.length > 0) {
    for (const violation of violationResponse.data) {
      typia.assert(violation);

      // Validate violation_type matches filter
      TestValidator.equals(
        "violation type should be misinformation",
        violation.violation_type,
        "misinformation",
      );

      // Validate severity_level matches filter
      TestValidator.equals(
        "severity level should be severe",
        violation.severity,
        "severe",
      );

      // Validate action_taken matches filter
      TestValidator.equals(
        "action taken should be reported_to_admin",
        violation.action_taken,
        "reported_to_admin",
      );

      // Validate violation record structure
      TestValidator.predicate(
        "violation has id",
        violation.id !== null &&
          violation.id !== undefined &&
          typeof violation.id === "string",
      );

      TestValidator.predicate(
        "violation has description",
        violation.violation_description !== null &&
          violation.violation_description !== undefined,
      );

      TestValidator.predicate(
        "violation has detected_at timestamp",
        violation.detected_at !== null && violation.detected_at !== undefined,
      );

      TestValidator.predicate(
        "violation has contributor summary",
        violation.contributor !== null && violation.contributor !== undefined,
      );

      TestValidator.predicate(
        "contributor has id",
        violation.contributor.id !== null &&
          violation.contributor.id !== undefined,
      );

      TestValidator.predicate(
        "contributor has username",
        violation.contributor.username !== null &&
          violation.contributor.username !== undefined,
      );

      TestValidator.predicate(
        "violation has moderator summary",
        violation.moderator !== null && violation.moderator !== undefined,
      );

      TestValidator.predicate(
        "moderator has id",
        violation.moderator.id !== null && violation.moderator.id !== undefined,
      );

      TestValidator.predicate(
        "moderator has username",
        violation.moderator.username !== null &&
          violation.moderator.username !== undefined,
      );

      TestValidator.predicate(
        "violation has created_at timestamp",
        violation.created_at !== null && violation.created_at !== undefined,
      );
    }
  }

  // Step 5: Validate response structure with data array
  TestValidator.predicate(
    "data array exists",
    Array.isArray(violationResponse.data),
  );
}
