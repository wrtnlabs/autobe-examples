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
 * Test complex filtering combining multiple criteria for suspension records.
 *
 * A moderator authenticates and retrieves suspensions filtered by:
 *
 * - Suspension_type='account_suspension'
 * - Status='active'
 * - Severity_level='severe'
 * - Suspended_from (date range start)
 * - Suspended_to (date range end)
 *
 * Validates that only suspensions matching ALL criteria are returned, ensuring
 * sophisticated multi-dimensional filtering for targeted enforcement analysis.
 *
 * Steps:
 *
 * 1. Create and authenticate a moderator account
 * 2. Define date range for filtering (suspended_from and suspended_to)
 * 3. Execute combined filter query with all criteria
 * 4. Validate response contains matching records
 * 5. Verify all returned suspensions match ALL filter criteria
 */
export async function test_api_moderation_suspensions_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "TestPass123!";
  const moderatorUsername =
    RandomGenerator.alphabets(3) +
    RandomGenerator.pick([..."0123456789"]) +
    "_" +
    RandomGenerator.alphabets(2);

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator authenticated successfully",
    moderator.id !== undefined && moderator.token !== undefined,
  );

  // Step 2: Define date range for filtering
  // Create a date range that covers the last 30 days
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const suspendedFrom = thirtyDaysAgo.toISOString();
  const suspendedTo = now.toISOString();

  // Step 3: Execute combined filter query with all criteria
  const filterRequest = {
    page: 1,
    limit: 50,
    suspension_type: "account_suspension" as const,
    status: "active" as const,
    severity_level: "severe" as const,
    suspended_from: suspendedFrom,
    suspended_to: suspendedTo,
  } satisfies IDiscussionBoardUserSuspension.IRequest;

  const result: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      { body: filterRequest },
    );
  typia.assert(result);

  // Step 4: Validate response structure
  TestValidator.predicate(
    "pagination information is present",
    result.pagination !== undefined &&
      result.pagination.current !== undefined &&
      result.pagination.limit !== undefined &&
      result.pagination.records !== undefined &&
      result.pagination.pages !== undefined,
  );

  TestValidator.predicate("data array is present", Array.isArray(result.data));

  // Step 5: Verify all returned suspensions match ALL filter criteria
  if (result.data.length > 0) {
    for (const suspension of result.data) {
      // Verify suspension_type matches filter
      TestValidator.equals(
        "suspension type matches account_suspension filter",
        suspension.suspension_type,
        "account_suspension",
      );

      // Verify status matches filter
      TestValidator.equals(
        "suspension status matches active filter",
        suspension.status,
        "active",
      );

      // Verify severity_level matches filter
      TestValidator.equals(
        "suspension severity level matches severe filter",
        suspension.severity_level,
        "severe",
      );

      // Verify suspension date is within range
      const suspensionDate = new Date(suspension.suspended_at);
      TestValidator.predicate(
        "suspension date is on or after suspended_from",
        suspensionDate >= thirtyDaysAgo,
      );

      TestValidator.predicate(
        "suspension date is on or before suspended_to",
        suspensionDate <= now,
      );

      // Verify moderator information is present
      TestValidator.predicate(
        "moderator information is present in suspension record",
        suspension.moderator !== undefined &&
          suspension.moderator.id !== undefined &&
          suspension.moderator.username !== undefined,
      );

      // Verify other required fields
      TestValidator.predicate(
        "suspension has required fields",
        suspension.id !== undefined &&
          suspension.reason !== undefined &&
          suspension.suspended_at !== undefined,
      );
    }
  }

  // Final validation: pagination is correct
  TestValidator.predicate(
    "current page is within valid range",
    result.pagination.current > 0,
  );

  TestValidator.predicate(
    "limit is within valid range",
    result.pagination.limit > 0 && result.pagination.limit <= 100,
  );

  TestValidator.predicate(
    "records count is non-negative",
    result.pagination.records >= 0,
  );
}
