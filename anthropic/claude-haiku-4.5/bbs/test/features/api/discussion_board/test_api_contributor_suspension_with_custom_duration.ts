import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";

/**
 * Test creating suspension with custom duration values not in the standard
 * list.
 *
 * This test validates that the suspension system accepts custom duration values
 * (such as 5, 14, 21 days) beyond the standard 3/7/30 day escalations. It
 * verifies that suspension expiration timestamps are calculated correctly based
 * on the custom duration provided.
 *
 * The test flow:
 *
 * 1. Create a moderator account with valid credentials
 * 2. Create a contributor account to be suspended
 * 3. Suspend the contributor with custom duration values (5, 14, and 21 days)
 * 4. Validate that suspension records are created with correct expiration
 *    timestamps
 * 5. Verify that the system correctly calculates expiration based on custom
 *    durations
 */
export async function test_api_contributor_suspension_with_custom_duration(
  connection: api.IConnection,
) {
  // Step 1: Register a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "TestPassword123!",
        username: RandomGenerator.alphaNumeric(8),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a contributor to suspend with custom duration of 5 days
  const customDuration5 = 5;
  const contributorId5 = typia.random<string & tags.Format<"uuid">>();

  const suspension5: IDiscussionBoardUserSuspension =
    await api.functional.discussionBoard.moderator.contributors.suspend.create(
      connection,
      {
        contributorId: contributorId5,
        body: {
          suspension_type: "posting_restriction",
          reason: "Test suspension with custom 5-day duration",
          severity_level: "minor",
          duration_days: customDuration5,
        } satisfies IDiscussionBoardUserSuspension.ICreate,
      },
    );
  typia.assert(suspension5);

  // Validate 5-day suspension
  TestValidator.equals(
    "custom 5-day suspension duration is stored correctly",
    suspension5.duration_days,
    customDuration5,
  );
  TestValidator.equals(
    "5-day suspension status is active",
    suspension5.status,
    "active",
  );
  TestValidator.predicate(
    "5-day suspension has expiration timestamp",
    suspension5.expiration_at !== null &&
      suspension5.expiration_at !== undefined,
  );

  // Step 3: Create another contributor to suspend with custom duration of 14 days
  const customDuration14 = 14;
  const contributorId14 = typia.random<string & tags.Format<"uuid">>();

  const suspension14: IDiscussionBoardUserSuspension =
    await api.functional.discussionBoard.moderator.contributors.suspend.create(
      connection,
      {
        contributorId: contributorId14,
        body: {
          suspension_type: "account_suspension",
          reason: "Test suspension with custom 14-day duration",
          severity_level: "moderate",
          duration_days: customDuration14,
        } satisfies IDiscussionBoardUserSuspension.ICreate,
      },
    );
  typia.assert(suspension14);

  // Validate 14-day suspension
  TestValidator.equals(
    "custom 14-day suspension duration is stored correctly",
    suspension14.duration_days,
    customDuration14,
  );
  TestValidator.equals(
    "14-day suspension status is active",
    suspension14.status,
    "active",
  );
  TestValidator.predicate(
    "14-day suspension has expiration timestamp",
    suspension14.expiration_at !== null &&
      suspension14.expiration_at !== undefined,
  );

  // Step 4: Create another contributor to suspend with custom duration of 21 days
  const customDuration21 = 21;
  const contributorId21 = typia.random<string & tags.Format<"uuid">>();

  const suspension21: IDiscussionBoardUserSuspension =
    await api.functional.discussionBoard.moderator.contributors.suspend.create(
      connection,
      {
        contributorId: contributorId21,
        body: {
          suspension_type: "posting_restriction",
          reason: "Test suspension with custom 21-day duration",
          severity_level: "severe",
          duration_days: customDuration21,
        } satisfies IDiscussionBoardUserSuspension.ICreate,
      },
    );
  typia.assert(suspension21);

  // Validate 21-day suspension
  TestValidator.equals(
    "custom 21-day suspension duration is stored correctly",
    suspension21.duration_days,
    customDuration21,
  );
  TestValidator.equals(
    "21-day suspension status is active",
    suspension21.status,
    "active",
  );
  TestValidator.predicate(
    "21-day suspension has expiration timestamp",
    suspension21.expiration_at !== null &&
      suspension21.expiration_at !== undefined,
  );

  // Step 5: Validate that expiration timestamps are correctly calculated
  // Parse suspension timestamps to validate duration calculation
  const suspendedAt5 = new Date(suspension5.suspended_at);
  const expiresAt5 = new Date(suspension5.expiration_at!);
  const durationMs5 = expiresAt5.getTime() - suspendedAt5.getTime();
  const expectedDurationMs5 = customDuration5 * 24 * 60 * 60 * 1000;

  TestValidator.predicate(
    "5-day suspension expiration is approximately correct",
    Math.abs(durationMs5 - expectedDurationMs5) < 1000, // Allow 1 second tolerance
  );

  const suspendedAt14 = new Date(suspension14.suspended_at);
  const expiresAt14 = new Date(suspension14.expiration_at!);
  const durationMs14 = expiresAt14.getTime() - suspendedAt14.getTime();
  const expectedDurationMs14 = customDuration14 * 24 * 60 * 60 * 1000;

  TestValidator.predicate(
    "14-day suspension expiration is approximately correct",
    Math.abs(durationMs14 - expectedDurationMs14) < 1000,
  );

  const suspendedAt21 = new Date(suspension21.suspended_at);
  const expiresAt21 = new Date(suspension21.expiration_at!);
  const durationMs21 = expiresAt21.getTime() - suspendedAt21.getTime();
  const expectedDurationMs21 = customDuration21 * 24 * 60 * 60 * 1000;

  TestValidator.predicate(
    "21-day suspension expiration is approximately correct",
    Math.abs(durationMs21 - expectedDurationMs21) < 1000,
  );

  // Validate different suspension types work with custom durations
  TestValidator.equals(
    "5-day suspension has posting_restriction type",
    suspension5.suspension_type,
    "posting_restriction",
  );
  TestValidator.equals(
    "14-day suspension has account_suspension type",
    suspension14.suspension_type,
    "account_suspension",
  );
  TestValidator.equals(
    "21-day suspension has posting_restriction type",
    suspension21.suspension_type,
    "posting_restriction",
  );
}
