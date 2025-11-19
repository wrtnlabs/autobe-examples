import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserSuspension";

/**
 * Test sorting suspensions by violation severity level.
 *
 * A moderator authenticates and retrieves suspensions with
 * sort_by='severity_level'. Validates that suspensions are grouped by severity
 * (permanent, severe, moderate, minor), enabling priority-based review of
 * violations requiring escalated attention.
 *
 * Test workflow:
 *
 * 1. Create a moderator account via authentication
 * 2. Retrieve suspensions sorted by severity_level
 * 3. Validate sorting order matches severity priorities
 * 4. Verify response structure and pagination
 */
export async function test_api_moderation_suspensions_sort_by_severity_level(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!";
  const moderatorUsername = RandomGenerator.alphabets(8);

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Retrieve suspensions sorted by severity level in descending order (severe to minor)
  const suspensionsResult: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          sort_by: "severity_level",
          order: "desc",
          limit: 100,
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(suspensionsResult);

  // Step 3: Validate response structure
  TestValidator.predicate(
    "pagination should exist",
    suspensionsResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array should exist",
    Array.isArray(suspensionsResult.data),
  );

  // Step 4: Validate severity level ordering
  const severityOrder = {
    permanent: 4,
    severe: 3,
    moderate: 2,
    minor: 1,
  };

  let previousSeverityLevel = 5; // Start higher than any valid level

  for (const suspension of suspensionsResult.data) {
    typia.assert(suspension);

    const currentSeverityValue = severityOrder[suspension.severity_level];

    TestValidator.predicate(
      `severity level should be in descending order: ${suspension.severity_level}`,
      currentSeverityValue <= previousSeverityLevel,
    );

    previousSeverityLevel = currentSeverityValue;
  }

  // Step 5: Validate pagination information
  TestValidator.predicate(
    "current page should be at least 0",
    suspensionsResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit should be positive",
    suspensionsResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records should be non-negative",
    suspensionsResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be non-negative",
    suspensionsResult.pagination.pages >= 0,
  );

  // Step 6: Validate suspension data structure for each record
  if (suspensionsResult.data.length > 0) {
    const firstSuspension = suspensionsResult.data[0];

    TestValidator.predicate(
      "suspension should have id",
      firstSuspension.id !== undefined && firstSuspension.id.length > 0,
    );
    TestValidator.predicate(
      "suspension should have moderator",
      firstSuspension.moderator !== undefined,
    );
    TestValidator.predicate(
      "suspension should have suspension_type",
      firstSuspension.suspension_type !== undefined,
    );
    TestValidator.predicate(
      "suspension should have reason",
      firstSuspension.reason !== undefined,
    );
    TestValidator.predicate(
      "suspension should have severity_level",
      firstSuspension.severity_level !== undefined,
    );
    TestValidator.predicate(
      "suspension should have status",
      firstSuspension.status !== undefined,
    );
    TestValidator.predicate(
      "suspension should have suspended_at",
      firstSuspension.suspended_at !== undefined,
    );
  }
}
