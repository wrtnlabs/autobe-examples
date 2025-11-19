import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";

/**
 * Test that time-limited suspensions have correct expiration_at calculation.
 *
 * Verifies that when a moderator creates a time-limited suspension (with
 * duration_days), the system correctly sets expiration_at to suspended_at +
 * duration_days. This test validates the automatic expiration scheduling
 * mechanism for temporary suspensions.
 *
 * Test procedure:
 *
 * 1. Create a moderator account via authentication
 * 2. Create a test contributor with a suspension ID to target
 * 3. Create a posting_restriction suspension with 3-day duration
 * 4. Verify expiration_at is set to suspended_at + 3 days
 * 5. Create an account_suspension with 7-day duration
 * 6. Verify expiration_at is set to suspended_at + 7 days
 * 7. Verify permanent_ban without duration has null expiration_at
 */
export async function test_api_contributor_suspension_time_limited_has_expiration(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePassword123!",
        username: RandomGenerator.alphabets(10),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create test contributor (using random UUID for contributor ID)
  const contributorId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Test posting_restriction with 3-day duration
  const suspensionTime = new Date();
  const postingRestriction: IDiscussionBoardUserSuspension =
    await api.functional.discussionBoard.moderator.contributors.suspend.create(
      connection,
      {
        contributorId,
        body: {
          suspension_type: "posting_restriction",
          reason: "Spam and inappropriate content detected",
          severity_level: "moderate",
          duration_days: 3,
        } satisfies IDiscussionBoardUserSuspension.ICreate,
      },
    );
  typia.assert(postingRestriction);

  // Verify suspension properties
  TestValidator.equals(
    "posting restriction suspension type",
    postingRestriction.suspension_type,
    "posting_restriction",
  );
  TestValidator.equals(
    "posting restriction status is active",
    postingRestriction.status,
    "active",
  );
  TestValidator.predicate(
    "posting restriction has duration_days set",
    postingRestriction.duration_days === 3,
  );

  // Verify expiration_at is calculated correctly (suspended_at + 3 days)
  TestValidator.predicate(
    "posting restriction has expiration_at set",
    postingRestriction.expiration_at !== null &&
      postingRestriction.expiration_at !== undefined,
  );

  if (postingRestriction.expiration_at) {
    const suspendedAtDate = new Date(postingRestriction.suspended_at);
    const expirationAtDate = new Date(postingRestriction.expiration_at);
    const expectedExpiration = new Date(
      suspendedAtDate.getTime() + 3 * 24 * 60 * 60 * 1000,
    );

    // Allow 1-minute tolerance for time differences
    const tolerance = 60 * 1000;
    const timeDiff = Math.abs(
      expirationAtDate.getTime() - expectedExpiration.getTime(),
    );
    TestValidator.predicate(
      "posting restriction expiration_at equals suspended_at + 3 days",
      timeDiff <= tolerance,
    );
  }

  // Step 4: Test account_suspension with 7-day duration
  const contributorId2 = typia.random<string & tags.Format<"uuid">>();
  const accountSuspension: IDiscussionBoardUserSuspension =
    await api.functional.discussionBoard.moderator.contributors.suspend.create(
      connection,
      {
        contributorId: contributorId2,
        body: {
          suspension_type: "account_suspension",
          reason: "Repeated violations of community guidelines",
          severity_level: "severe",
          duration_days: 7,
        } satisfies IDiscussionBoardUserSuspension.ICreate,
      },
    );
  typia.assert(accountSuspension);

  // Verify suspension properties
  TestValidator.equals(
    "account suspension type",
    accountSuspension.suspension_type,
    "account_suspension",
  );
  TestValidator.equals(
    "account suspension status is active",
    accountSuspension.status,
    "active",
  );
  TestValidator.predicate(
    "account suspension has duration_days set",
    accountSuspension.duration_days === 7,
  );

  // Verify expiration_at is calculated correctly (suspended_at + 7 days)
  TestValidator.predicate(
    "account suspension has expiration_at set",
    accountSuspension.expiration_at !== null &&
      accountSuspension.expiration_at !== undefined,
  );

  if (accountSuspension.expiration_at) {
    const suspendedAtDate = new Date(accountSuspension.suspended_at);
    const expirationAtDate = new Date(accountSuspension.expiration_at);
    const expectedExpiration = new Date(
      suspendedAtDate.getTime() + 7 * 24 * 60 * 60 * 1000,
    );

    // Allow 1-minute tolerance for time differences
    const tolerance = 60 * 1000;
    const timeDiff = Math.abs(
      expirationAtDate.getTime() - expectedExpiration.getTime(),
    );
    TestValidator.predicate(
      "account suspension expiration_at equals suspended_at + 7 days",
      timeDiff <= tolerance,
    );
  }

  // Step 5: Test permanent_ban without duration (should have null expiration_at)
  const contributorId3 = typia.random<string & tags.Format<"uuid">>();
  const permanentBan: IDiscussionBoardUserSuspension =
    await api.functional.discussionBoard.moderator.contributors.suspend.create(
      connection,
      {
        contributorId: contributorId3,
        body: {
          suspension_type: "permanent_ban",
          reason: "Severe violation - hate speech and threats",
          severity_level: "permanent",
        } satisfies IDiscussionBoardUserSuspension.ICreate,
      },
    );
  typia.assert(permanentBan);

  // Verify permanent ban has no expiration
  TestValidator.equals(
    "permanent ban suspension type",
    permanentBan.suspension_type,
    "permanent_ban",
  );
  TestValidator.equals(
    "permanent ban status is active",
    permanentBan.status,
    "active",
  );
  TestValidator.predicate(
    "permanent ban has null expiration_at",
    permanentBan.expiration_at === null ||
      permanentBan.expiration_at === undefined,
  );
}
