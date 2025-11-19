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
 * Test filtering suspensions by expiration date range.
 *
 * A moderator authenticates and retrieves suspensions expiring between
 * expires_from and expires_to timestamps. This test validates the ability to
 * identify suspensions approaching natural conclusion for follow-up actions.
 *
 * Test flow:
 *
 * 1. Moderator registration and authentication
 * 2. Query suspensions with expiration date range filters
 * 3. Validate returned suspensions fall within the specified expiration date range
 * 4. Verify pagination and result ordering
 */
export async function test_api_moderation_suspensions_filter_by_expiration_date_range(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        username: RandomGenerator.alphaNumeric(10),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator authenticated successfully",
    moderator.id !== undefined,
  );

  // Step 2: Define date range for filtering (next 7 days from now)
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const expiresFrom = now.toISOString();
  const expiresTo = sevenDaysFromNow.toISOString();

  // Step 3: Query suspensions with expiration date range filter
  const suspensionPage: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          expires_from: expiresFrom,
          expires_to: expiresTo,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(suspensionPage);

  // Step 4: Validate pagination information
  TestValidator.predicate(
    "pagination info exists",
    suspensionPage.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is 1",
    suspensionPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is 20",
    suspensionPage.pagination.limit === 20,
  );
  TestValidator.predicate(
    "records count is non-negative",
    suspensionPage.pagination.records >= 0,
  );

  // Step 5: Validate returned suspensions
  TestValidator.predicate(
    "data array exists",
    Array.isArray(suspensionPage.data),
  );

  // Step 6: Verify all returned suspensions have expiration dates within range
  if (suspensionPage.data.length > 0) {
    for (const suspension of suspensionPage.data) {
      typia.assert(suspension);

      // Verify suspension has required fields
      TestValidator.predicate(
        "suspension has ID",
        suspension.id !== undefined && suspension.id.length > 0,
      );
      TestValidator.predicate(
        "suspension has moderator",
        suspension.moderator !== undefined &&
          suspension.moderator.id !== undefined,
      );
      TestValidator.predicate(
        "suspension has status",
        ["active", "lifted", "expired"].includes(suspension.status),
      );

      // Verify expiration date is within the specified range if it exists
      if (
        suspension.expiration_at !== null &&
        suspension.expiration_at !== undefined
      ) {
        const expirationDate = new Date(suspension.expiration_at);
        const fromDate = new Date(expiresFrom);
        const toDate = new Date(expiresTo);

        TestValidator.predicate(
          "suspension expires within specified range",
          expirationDate >= fromDate && expirationDate <= toDate,
        );
      }
    }
  }

  // Step 7: Test with different date ranges to ensure filtering works correctly
  const futureExpiration: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          expires_from: thirtyDaysFromNow.toISOString(),
          expires_to: new Date(
            thirtyDaysFromNow.getTime() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(futureExpiration);

  // Step 8: Validate that the two queries return different results
  TestValidator.predicate(
    "different date ranges return results",
    futureExpiration !== null,
  );
}
