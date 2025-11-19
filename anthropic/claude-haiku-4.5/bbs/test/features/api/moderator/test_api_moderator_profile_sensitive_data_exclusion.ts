import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test that sensitive information is not included in moderator profile
 * response.
 *
 * This test validates security constraints by ensuring that sensitive data such
 * as password hashes, plaintext passwords, and session tokens are never exposed
 * in the moderator profile API response. The test creates a moderator account
 * and then retrieves the profile to verify that the response contains only
 * public profile information and excludes all sensitive fields.
 *
 * Security validation steps:
 *
 * 1. Create a new moderator account with email, password, and username
 * 2. Retrieve the authenticated moderator's profile
 * 3. Verify that the profile response does not contain password_hash field
 * 4. Verify that the profile response does not contain password or plaintext
 *    password
 * 5. Verify that the profile response does not contain session tokens
 * 6. Verify that the profile response contains only expected public fields
 * 7. Ensure all returned properties are of correct types
 */
export async function test_api_moderator_profile_sensitive_data_exclusion(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!";
  const moderatorUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();

  const createdModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });

  typia.assert(createdModerator);

  // Step 2: Retrieve the moderator profile
  const profile: IDiscussionBoardUser =
    await api.functional.discussionBoard.moderator.profile.at(connection);

  typia.assert(profile);

  // Step 3: Verify profile contains expected public fields
  TestValidator.equals(
    "profile id matches created moderator",
    profile.id,
    createdModerator.id,
  );

  TestValidator.equals(
    "profile email matches created moderator email",
    profile.email,
    createdModerator.email,
  );

  TestValidator.equals(
    "profile username matches created moderator username",
    profile.username,
    createdModerator.username,
  );

  // Step 4: Verify email_verified status is correctly returned
  TestValidator.equals(
    "email_verified status is boolean",
    typeof profile.emailVerified,
    "boolean",
  );

  // Step 5: Verify account_status is one of expected values
  TestValidator.predicate(
    "account_status is valid status",
    profile.accountStatus === "active" ||
      profile.accountStatus === "suspended" ||
      profile.accountStatus === "restricted" ||
      profile.accountStatus === "deleted",
  );

  // Step 6: Verify sensitive fields are NOT present in response
  TestValidator.predicate(
    "password_hash is not exposed in profile",
    (profile as any).password_hash === undefined &&
      (profile as any).passwordHash === undefined,
  );

  TestValidator.predicate(
    "plaintext password is not exposed in profile",
    (profile as any).password === undefined &&
      (profile as any).plaintext_password === undefined &&
      (profile as any).plaintextPassword === undefined,
  );

  TestValidator.predicate(
    "session tokens are not exposed in profile",
    (profile as any).token === undefined &&
      (profile as any).access_token === undefined &&
      (profile as any).accessToken === undefined &&
      (profile as any).refresh_token === undefined &&
      (profile as any).refreshToken === undefined &&
      (profile as any).session === undefined,
  );

  TestValidator.predicate(
    "JWT tokens from authorization response are not in profile",
    (profile as any).access === undefined &&
      (profile as any).refresh === undefined &&
      (profile as any).expired_at === undefined &&
      (profile as any).refreshable_until === undefined,
  );

  // Step 7: Verify timestamps are present and valid ISO format
  TestValidator.predicate(
    "createdAt timestamp is present",
    profile.createdAt !== null && profile.createdAt !== undefined,
  );

  TestValidator.predicate(
    "updatedAt timestamp is present",
    profile.updatedAt !== null && profile.updatedAt !== undefined,
  );

  // Step 8: Verify optional fields have correct types if present
  if (profile.lastLoginAt !== undefined) {
    TestValidator.predicate(
      "lastLoginAt is null or ISO date string",
      profile.lastLoginAt === null ||
        (typeof profile.lastLoginAt === "string" &&
          /^\d{4}-\d{2}-\d{2}T/.test(profile.lastLoginAt)),
    );
  }

  if (profile.passwordChangedAt !== undefined) {
    TestValidator.predicate(
      "passwordChangedAt is null or ISO date string",
      profile.passwordChangedAt === null ||
        (typeof profile.passwordChangedAt === "string" &&
          /^\d{4}-\d{2}-\d{2}T/.test(profile.passwordChangedAt)),
    );
  }

  if (profile.deletedAt !== undefined) {
    TestValidator.predicate(
      "deletedAt is null or ISO date string",
      profile.deletedAt === null ||
        (typeof profile.deletedAt === "string" &&
          /^\d{4}-\d{2}-\d{2}T/.test(profile.deletedAt)),
    );
  }

  // Step 9: Verify no unexpected properties are present
  TestValidator.predicate(
    "profile does not contain suspicious fields",
    (profile as any).bcrypt === undefined &&
      (profile as any).hash === undefined &&
      (profile as any).salt === undefined &&
      (profile as any).secret === undefined &&
      (profile as any).authorization === undefined,
  );
}
