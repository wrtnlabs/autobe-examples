import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test that profile retrieval includes complete account metadata with all
 * timestamps.
 *
 * This test validates that the /my/profile endpoint returns comprehensive
 * account lifecycle information including:
 *
 * - CreatedAt: Account creation timestamp (always present)
 * - UpdatedAt: Last modification timestamp (always present)
 * - LastLoginAt: Most recent login timestamp (null for never-logged-in accounts)
 * - PasswordChangedAt: Last password change timestamp (null if never changed)
 * - DeletedAt: Soft deletion timestamp (null for active accounts)
 *
 * The test verifies:
 *
 * 1. All timestamps are in valid ISO 8601 format (validated by typia.assert)
 * 2. Nullable timestamps are explicitly null when not set
 * 3. Non-nullable timestamps (createdAt, updatedAt) are always present
 * 4. Temporal relationships are consistent (e.g., lastLoginAt >= createdAt)
 * 5. Account status properly reflects lifecycle state (deleted accounts have
 *    deletedAt)
 * 6. Other account metadata (email, username, emailVerified) is complete
 */
export async function test_api_profile_retrieval_includes_account_metadata(
  connection: api.IConnection,
) {
  // Retrieve the authenticated user's profile
  const profile: IDiscussionBoardUser =
    await api.functional.my.profile.at(connection);
  typia.assert(profile);

  // Verify non-nullable timestamps are present and valid
  TestValidator.predicate(
    "createdAt should be a valid timestamp",
    profile.createdAt !== null && profile.createdAt !== undefined,
  );

  TestValidator.predicate(
    "updatedAt should be a valid timestamp",
    profile.updatedAt !== null && profile.updatedAt !== undefined,
  );

  // Verify temporal consistency: createdAt should be before or equal to updatedAt
  TestValidator.predicate(
    "createdAt should be before or equal to updatedAt",
    new Date(profile.createdAt) <= new Date(profile.updatedAt),
  );

  // Verify lastLoginAt temporal consistency when present
  if (profile.lastLoginAt !== null && profile.lastLoginAt !== undefined) {
    TestValidator.predicate(
      "lastLoginAt should not be before createdAt",
      new Date(profile.lastLoginAt) >= new Date(profile.createdAt),
    );
  }

  // Verify passwordChangedAt temporal consistency when present
  if (
    profile.passwordChangedAt !== null &&
    profile.passwordChangedAt !== undefined
  ) {
    TestValidator.predicate(
      "passwordChangedAt should not be before createdAt",
      new Date(profile.passwordChangedAt) >= new Date(profile.createdAt),
    );
  }

  // Verify deletedAt temporal consistency when present
  if (profile.deletedAt !== null && profile.deletedAt !== undefined) {
    TestValidator.predicate(
      "deletedAt should not be before createdAt",
      new Date(profile.deletedAt) >= new Date(profile.createdAt),
    );

    // Deleted accounts must have accountStatus set to 'deleted'
    TestValidator.equals(
      "accountStatus should be 'deleted' when deletedAt is set",
      profile.accountStatus,
      "deleted",
    );
  } else {
    // Active accounts should not have deletedAt set
    TestValidator.predicate(
      "accountStatus should not be 'deleted' when deletedAt is null",
      profile.accountStatus !== "deleted",
    );
  }

  // Verify account status is one of the valid values
  TestValidator.predicate(
    "accountStatus should be one of: active, suspended, restricted, or deleted",
    ["active", "suspended", "restricted", "deleted"].includes(
      profile.accountStatus,
    ),
  );

  // Verify core profile fields are present and valid
  TestValidator.predicate(
    "id should exist and be non-empty",
    profile.id !== null && profile.id !== undefined && profile.id.length > 0,
  );

  TestValidator.predicate(
    "email should exist and be non-empty",
    profile.email !== null &&
      profile.email !== undefined &&
      profile.email.length > 0,
  );

  TestValidator.predicate(
    "username should exist and be non-empty",
    profile.username !== null &&
      profile.username !== undefined &&
      profile.username.length > 0,
  );

  TestValidator.predicate(
    "emailVerified should be a boolean",
    typeof profile.emailVerified === "boolean",
  );

  // Verify moderationTier is properly set (null/undefined for contributors, or string for moderators)
  TestValidator.predicate(
    "moderationTier should be null/undefined or a non-empty string",
    profile.moderationTier === null ||
      profile.moderationTier === undefined ||
      (typeof profile.moderationTier === "string" &&
        profile.moderationTier.length > 0),
  );
}
