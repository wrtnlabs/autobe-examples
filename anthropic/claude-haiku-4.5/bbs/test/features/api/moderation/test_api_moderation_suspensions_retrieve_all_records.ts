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
 * Test basic suspension list retrieval without filtering.
 *
 * A moderator authenticates and retrieves all contributor account suspension
 * and restriction records with default pagination. Validates that the response
 * includes suspension type, status, duration, moderator, timestamps, and
 * severity level. Verifies pagination metadata (current page, limit, total
 * records, total pages) is correctly returned. Tests core functionality of
 * accessing the complete suspension enforcement record.
 *
 * Test flow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Retrieve all suspension records with default pagination
 * 3. Validate response structure and pagination information
 * 4. Verify suspension records contain all required fields
 */
export async function test_api_moderation_suspensions_retrieve_all_records(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(10);
  const moderatorPassword = "TestPass123!";

  const authenticatedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(authenticatedModerator);

  TestValidator.equals(
    "moderator email matches input",
    authenticatedModerator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator username matches input",
    authenticatedModerator.username,
    moderatorUsername,
  );
  TestValidator.predicate(
    "moderator is active",
    () => authenticatedModerator.account_status === "active",
  );
  TestValidator.predicate(
    "moderator has full moderation tier",
    () => authenticatedModerator.moderation_tier === "full",
  );

  // Step 2: Retrieve all suspension records with default pagination
  const suspensionPage: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {} satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(suspensionPage);

  // Step 3: Validate pagination metadata
  TestValidator.predicate(
    "current page is valid",
    () => suspensionPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is positive",
    () => suspensionPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records is non-negative",
    () => suspensionPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    () => suspensionPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination math is correct",
    () =>
      (suspensionPage.pagination.records === 0 &&
        suspensionPage.pagination.pages === 0) ||
      (suspensionPage.pagination.records > 0 &&
        suspensionPage.pagination.pages ===
          Math.ceil(
            suspensionPage.pagination.records / suspensionPage.pagination.limit,
          )),
  );

  // Step 4: Validate suspension records structure
  if (suspensionPage.data.length > 0) {
    const suspension = suspensionPage.data[0];

    TestValidator.predicate(
      "suspension has valid id",
      () => typeof suspension.id === "string" && suspension.id.length > 0,
    );
    TestValidator.predicate(
      "suspension has moderator",
      () =>
        suspension.moderator &&
        typeof suspension.moderator.id === "string" &&
        typeof suspension.moderator.username === "string",
    );
    TestValidator.predicate(
      "suspension type is valid",
      () =>
        suspension.suspension_type &&
        ["posting_restriction", "account_suspension", "permanent_ban"].includes(
          suspension.suspension_type,
        ),
    );
    TestValidator.predicate(
      "suspension has reason",
      () =>
        typeof suspension.reason === "string" && suspension.reason.length > 0,
    );
    TestValidator.predicate(
      "severity level is valid",
      () =>
        suspension.severity_level &&
        ["minor", "moderate", "severe", "permanent"].includes(
          suspension.severity_level,
        ),
    );
    TestValidator.predicate(
      "suspension status is valid",
      () =>
        suspension.status &&
        ["active", "lifted", "expired"].includes(suspension.status),
    );
    TestValidator.predicate(
      "suspension has suspended_at timestamp",
      () =>
        typeof suspension.suspended_at === "string" &&
        suspension.suspended_at.length > 0,
    );
    TestValidator.predicate(
      "duration_days is valid when present",
      () =>
        suspension.duration_days === undefined ||
        suspension.duration_days === null ||
        typeof suspension.duration_days === "number",
    );
  }

  TestValidator.predicate(
    "suspension data array matches pagination limit",
    () => suspensionPage.data.length <= suspensionPage.pagination.limit,
  );
}
