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
 * Test that violation records response includes contributor summary
 * information.
 *
 * This test validates that when a moderator authenticates and requests
 * violation records, the system returns each violation with embedded
 * contributor summary information showing the contributor's username and ID.
 * The test ensures that contributor context is properly included in violation
 * responses without requiring separate queries.
 *
 * Test steps:
 *
 * 1. Create and authenticate a moderator account
 * 2. Request violation records with filtering parameters
 * 3. Validate that the response includes violation records with pagination info
 * 4. Verify that each violation record includes contributor summary
 * 5. Confirm that contributor summary has both id and username properties
 * 6. Validate that each violation also includes moderator summary
 */
export async function test_api_violations_response_includes_contributor_summary(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(8) + "A1!",
    username: RandomGenerator.alphabets(5) + RandomGenerator.alphaNumeric(2),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  TestValidator.equals(
    "moderator email matches request",
    moderator.email,
    moderatorData.email,
  );
  TestValidator.equals(
    "moderator username matches request",
    moderator.username,
    moderatorData.username,
  );
  TestValidator.predicate("moderator is authorized", moderator.token !== null);

  // Step 2: Request violation records with filtering parameters
  const violationRequest = {
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardContentViolationRecord.IRequest;

  const violationResponse: IPageIDiscussionBoardContentViolationRecord.ISummary =
    await api.functional.discussionBoard.moderator.moderation.violations.index(
      connection,
      {
        body: violationRequest,
      },
    );
  typia.assert(violationResponse);

  // Step 3: Validate that the response includes violation records with pagination info
  TestValidator.predicate(
    "violation response has pagination",
    violationResponse.pagination !== null,
  );
  TestValidator.predicate(
    "pagination has current page",
    violationResponse.pagination.current !== undefined,
  );
  TestValidator.predicate(
    "pagination has limit",
    violationResponse.pagination.limit !== undefined,
  );
  TestValidator.predicate(
    "pagination has total records count",
    violationResponse.pagination.records !== undefined,
  );
  TestValidator.predicate(
    "pagination has total pages",
    violationResponse.pagination.pages !== undefined,
  );

  // Step 4: Verify that each violation record includes contributor summary
  if (violationResponse.data.length > 0) {
    violationResponse.data.forEach((violation) => {
      TestValidator.predicate(
        "violation has contributor",
        violation.contributor !== null && violation.contributor !== undefined,
      );

      // Step 5: Confirm that contributor summary has both id and username properties
      TestValidator.predicate(
        "contributor has id property",
        violation.contributor.id !== null &&
          violation.contributor.id !== undefined,
      );
      TestValidator.predicate(
        "contributor id is valid UUID",
        typeof violation.contributor.id === "string" &&
          violation.contributor.id.length > 0,
      );

      TestValidator.predicate(
        "contributor has username property",
        violation.contributor.username !== null &&
          violation.contributor.username !== undefined,
      );
      TestValidator.predicate(
        "contributor username is string",
        typeof violation.contributor.username === "string" &&
          violation.contributor.username.length > 0,
      );

      // Step 6: Validate that each violation also includes moderator summary
      TestValidator.predicate(
        "violation has moderator",
        violation.moderator !== null && violation.moderator !== undefined,
      );
      TestValidator.predicate(
        "moderator has id property",
        violation.moderator.id !== null && violation.moderator.id !== undefined,
      );
      TestValidator.predicate(
        "moderator has username property",
        violation.moderator.username !== null &&
          violation.moderator.username !== undefined,
      );

      // Verify other violation properties
      TestValidator.predicate(
        "violation has id",
        violation.id !== null && violation.id !== undefined,
      );
      TestValidator.predicate(
        "violation has type",
        violation.violation_type !== null &&
          violation.violation_type !== undefined,
      );
      TestValidator.predicate(
        "violation has severity",
        violation.severity !== null && violation.severity !== undefined,
      );
      TestValidator.predicate(
        "violation has description",
        violation.violation_description !== null &&
          violation.violation_description !== undefined,
      );
      TestValidator.predicate(
        "violation has action taken",
        violation.action_taken !== null && violation.action_taken !== undefined,
      );
      TestValidator.predicate(
        "violation has detection timestamp",
        violation.detected_at !== null && violation.detected_at !== undefined,
      );
      TestValidator.predicate(
        "violation has creation timestamp",
        violation.created_at !== null && violation.created_at !== undefined,
      );
    });
  }

  // Additional validation: Test with specific filters
  const filteredRequest = {
    page: 1,
    limit: 10,
    severity_level: "severe" as const,
  } satisfies IDiscussionBoardContentViolationRecord.IRequest;

  const filteredResponse: IPageIDiscussionBoardContentViolationRecord.ISummary =
    await api.functional.discussionBoard.moderator.moderation.violations.index(
      connection,
      {
        body: filteredRequest,
      },
    );
  typia.assert(filteredResponse);

  TestValidator.predicate(
    "filtered response is valid",
    filteredResponse.pagination !== null && filteredResponse.data !== null,
  );
}
