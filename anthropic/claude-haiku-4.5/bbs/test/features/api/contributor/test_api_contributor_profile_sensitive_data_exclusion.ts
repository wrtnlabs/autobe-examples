import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test that sensitive information is not included in profile response.
 *
 * Validates security constraints on data exposure by:
 *
 * 1. Creating a new contributor account with email, username, and password
 * 2. Retrieving the authenticated contributor's profile
 * 3. Verifying password_hash is not exposed in the response
 * 4. Verifying session tokens are not included in the response
 * 5. Confirming no plaintext passwords are returned
 * 6. Ensuring only safe profile information (id, email, username, status,
 *    timestamps) is present
 *
 * This test ensures the API properly excludes sensitive data from responses,
 * protecting user credentials and authentication information.
 */
export async function test_api_contributor_profile_sensitive_data_exclusion(
  connection: api.IConnection,
) {
  // Step 1: Create a contributor account
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<50> &
        tags.Pattern<"^[a-zA-Z0-9_]+$">
    >(),
    password: "SecurePass123!@#",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardContributor.ICreate;

  const authenticatedContributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: createBody,
    });
  typia.assert(authenticatedContributor);

  // Step 2: Retrieve the authenticated contributor's profile
  const profile: IDiscussionBoardUser =
    await api.functional.discussionBoard.contributor.profile.at(connection);
  typia.assert(profile);

  // Step 3: Verify the profile contains expected safe fields
  TestValidator.equals(
    "profile id matches created contributor",
    profile.id,
    authenticatedContributor.id,
  );

  TestValidator.equals(
    "profile email matches created contributor",
    profile.email,
    authenticatedContributor.email,
  );

  TestValidator.equals(
    "profile username matches created contributor",
    profile.username,
    authenticatedContributor.username,
  );

  // Step 4: Verify sensitive fields are NOT present in the response
  TestValidator.predicate(
    "password_hash is not exposed in profile",
    !("password_hash" in profile) && !("passwordHash" in profile),
  );

  TestValidator.predicate(
    "session tokens are not included in profile",
    !("token" in profile) &&
      !("access_token" in profile) &&
      !("refresh_token" in profile) &&
      !("accessToken" in profile) &&
      !("refreshToken" in profile),
  );

  TestValidator.predicate(
    "plaintext password is not in profile response",
    !("password" in profile),
  );

  TestValidator.predicate(
    "bcrypt hash is not exposed",
    !("hash" in profile) && !("bcrypt" in profile),
  );

  // Step 5: Verify only safe profile information is present
  TestValidator.predicate(
    "profile has id field",
    typeof profile.id === "string" && profile.id.length > 0,
  );

  TestValidator.predicate(
    "profile has email field",
    typeof profile.email === "string" && profile.email.includes("@"),
  );

  TestValidator.predicate(
    "profile has username field",
    typeof profile.username === "string" && profile.username.length >= 3,
  );

  TestValidator.predicate(
    "profile has emailVerified field",
    typeof profile.emailVerified === "boolean",
  );

  TestValidator.predicate(
    "profile has accountStatus field",
    typeof profile.accountStatus === "string" &&
      ["active", "suspended", "restricted", "deleted"].includes(
        profile.accountStatus,
      ),
  );

  TestValidator.predicate(
    "profile has createdAt timestamp",
    typeof profile.createdAt === "string" && profile.createdAt.length > 0,
  );

  TestValidator.predicate(
    "profile has updatedAt timestamp",
    typeof profile.updatedAt === "string" && profile.updatedAt.length > 0,
  );

  // Step 6: Verify moderationTier is null for contributors
  TestValidator.predicate(
    "moderationTier is null for regular contributor",
    profile.moderationTier === undefined || profile.moderationTier === null,
  );
}
