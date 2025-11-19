import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";

/**
 * Validate that suspension timestamps are correctly calculated and set.
 *
 * This test ensures that when a contributor is suspended, all timestamp fields
 * are properly initialized and calculated according to business rules:
 *
 * - Suspended_at is set to current time
 * - Expiration_at is calculated as suspended_at + duration_days (if applicable)
 * - Lifted_at is null initially
 * - Created_at and updated_at are set to current time
 *
 * Steps:
 *
 * 1. Register a new moderator account
 * 2. Create a suspension with a specific duration_days
 * 3. Verify suspended_at matches approximately current time
 * 4. Verify expiration_at is suspended_at + (duration_days * 24 hours)
 * 5. Verify lifted_at is null
 * 6. Verify created_at and updated_at match suspended_at
 */
export async function test_api_contributor_suspension_timestamps_correct(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        username: RandomGenerator.alphabets(8),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a suspension for a contributor with duration_days = 7
  const durationDays: number & tags.Type<"int32"> & tags.Minimum<0> = 7;
  const beforeSuspension = new Date();

  const suspension: IDiscussionBoardUserSuspension =
    await api.functional.discussionBoard.moderator.contributors.suspend.create(
      connection,
      {
        contributorId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          suspension_type: "posting_restriction",
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          severity_level: "moderate",
          duration_days: durationDays,
        } satisfies IDiscussionBoardUserSuspension.ICreate,
      },
    );
  typia.assert(suspension);

  const afterSuspension = new Date();

  // Step 3: Verify suspended_at is approximately current time
  const suspendedAtDate = new Date(suspension.suspended_at);
  TestValidator.predicate(
    "suspended_at should be within expected timeframe",
    suspendedAtDate >= beforeSuspension && suspendedAtDate <= afterSuspension,
  );

  // Step 4: Verify expiration_at is suspended_at + (duration_days * 24 * 60 * 60 * 1000) milliseconds
  if (
    suspension.expiration_at !== null &&
    suspension.expiration_at !== undefined
  ) {
    const expirationAtDate = new Date(suspension.expiration_at);
    const expectedExpirationTime =
      suspendedAtDate.getTime() + durationDays * 24 * 60 * 60 * 1000;
    const actualExpirationTime = expirationAtDate.getTime();
    const timeDifference = Math.abs(
      actualExpirationTime - expectedExpirationTime,
    );

    // Allow 1 second tolerance for clock differences
    TestValidator.predicate(
      "expiration_at should be suspended_at + duration_days",
      timeDifference < 1000,
    );
  }

  // Step 5: Verify lifted_at is null initially
  TestValidator.equals(
    "lifted_at should be null initially",
    suspension.lifted_at,
    null,
  );

  // Step 6: Verify created_at and updated_at are set to approximately current time
  const createdAtDate = new Date(suspension.created_at);
  const updatedAtDate = new Date(suspension.updated_at);

  TestValidator.predicate(
    "created_at should be within expected timeframe",
    createdAtDate >= beforeSuspension && createdAtDate <= afterSuspension,
  );

  TestValidator.predicate(
    "updated_at should be within expected timeframe",
    updatedAtDate >= beforeSuspension && updatedAtDate <= afterSuspension,
  );

  // Verify that created_at and updated_at are close to suspended_at
  const createdToSuspendedDiff = Math.abs(
    createdAtDate.getTime() - suspendedAtDate.getTime(),
  );
  const updatedToSuspendedDiff = Math.abs(
    updatedAtDate.getTime() - suspendedAtDate.getTime(),
  );

  TestValidator.predicate(
    "created_at should be very close to suspended_at",
    createdToSuspendedDiff < 1000,
  );

  TestValidator.predicate(
    "updated_at should be very close to suspended_at",
    updatedToSuspendedDiff < 1000,
  );

  // Verify suspension status is active
  TestValidator.equals(
    "suspension status should be active",
    suspension.status,
    "active",
  );
}
