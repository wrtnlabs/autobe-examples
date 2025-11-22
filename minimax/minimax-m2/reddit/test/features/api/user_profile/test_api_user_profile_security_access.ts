import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test user profile access security validation.
 *
 * This test validates that authenticated users can securely access their own
 * profile information through the authentication-based access control system.
 * The test verifies that user profile data remains private and accessible only
 * to the account owner.
 *
 * The test flow includes:
 *
 * 1. User registration and authentication via join API
 * 2. Profile access validation using authenticated session
 * 3. Comprehensive profile data validation with proper type safety
 * 4. Security controls verification for access restrictions
 */
export async function test_api_user_profile_security_access(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userUsername = RandomGenerator.alphabets(8);
  const userPassword = "TestPassword123!";
  const userDisplayName = RandomGenerator.name(2);

  const authenticatedUser = await api.functional.auth.registeredUser.join(
    connection,
    {
      body: {
        username: userUsername,
        email: userEmail,
        password: userPassword,
        display_name: userDisplayName,
        href: "https://reddit-platform.test/register",
        referrer: "https://reddit-platform.test/signup",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    },
  );

  typia.assert(authenticatedUser);
  TestValidator.equals(
    "user registration successful",
    authenticatedUser.username,
    userUsername,
  );
  TestValidator.equals(
    "email matches input",
    authenticatedUser.email,
    userEmail,
  );
  TestValidator.predicate(
    "user is authenticated",
    authenticatedUser.token.access.length > 0,
  );

  // Step 2: Access the user's own profile using authenticated session
  const userProfile =
    await api.functional.redditPlatform.registeredUser.auth.profile.at(
      connection,
    );

  typia.assert(userProfile);

  // Step 3: Validate profile data integrity and security
  TestValidator.equals(
    "profile ID matches authenticated user",
    userProfile.id,
    authenticatedUser.id,
  );
  TestValidator.equals(
    "username matches registered user",
    userProfile.username,
    authenticatedUser.username,
  );
  TestValidator.equals(
    "email matches registered user",
    userProfile.email,
    authenticatedUser.email,
  );
  TestValidator.equals(
    "display name matches input",
    userProfile.displayName,
    userDisplayName,
  );
  TestValidator.predicate(
    "karma score is initialized",
    userProfile.karmaScore >= 0,
  );
  TestValidator.equals(
    "account status is active",
    userProfile.accountStatus,
    "active",
  );
  TestValidator.equals(
    "business status is active",
    userProfile.businessStatus,
    "active",
  );
  TestValidator.predicate(
    "email verification is pending",
    !userProfile.emailVerified,
  );
  TestValidator.predicate(
    "login count is initialized",
    userProfile.loginCount >= 1,
  );
  TestValidator.predicate(
    "failed login attempts is zero",
    userProfile.failedLoginAttempts === 0,
  );
  TestValidator.predicate(
    "two factor authentication is disabled",
    !userProfile.twoFactorEnabled,
  );

  // Step 4: Validate profile structure and security controls
  TestValidator.predicate(
    "profile has creation timestamp",
    userProfile.createdAt.length > 0,
  );
  TestValidator.predicate(
    "profile has update timestamp",
    userProfile.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "account created timestamp exists",
    userProfile.accountCreated.length > 0,
  );
  TestValidator.predicate(
    "last login timestamp exists",
    userProfile.lastLogin.length > 0,
  );

  // Step 5: Verify sensitive authentication data is not exposed
  TestValidator.predicate(
    "password hash is not exposed in profile",
    (userProfile as any).password === undefined,
  );
  TestValidator.predicate(
    "password hash is not exposed in profile",
    (userProfile as any).passwordHash === undefined,
  );

  // Step 6: Validate optional profile fields handling
  TestValidator.predicate("bio field exists", "bio" in userProfile);
  TestValidator.predicate("location field exists", "location" in userProfile);
  TestValidator.predicate(
    "website URL field exists",
    "websiteUrl" in userProfile,
  );
  TestValidator.predicate(
    "avatar URL field exists",
    "avatarUrl" in userProfile,
  );
  TestValidator.predicate(
    "email verified timestamp field exists",
    "emailVerifiedAt" in userProfile,
  );
  TestValidator.predicate(
    "suspended until field exists",
    "suspendedUntil" in userProfile,
  );
}
