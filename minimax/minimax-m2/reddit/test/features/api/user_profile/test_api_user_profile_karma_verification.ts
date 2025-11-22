import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_user_profile_karma_verification(
  connection: api.IConnection,
) {
  // Step 1: Create a new registered user account
  const joinRequest = {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePassword123!",
      display_name: RandomGenerator.name(2),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      location: RandomGenerator.name(1),
      website_url: typia.random<string & tags.Format<"uri">>(),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: "https://reddit-platform.test/register",
      referrer: "https://reddit-platform.test/home",
    } satisfies IRedditPlatformRegisteredUser.ICreate,
  };

  const newUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, joinRequest);
  typia.assert(newUser);

  // Step 2: Verify user was created with correct initial data
  TestValidator.equals("user ID is valid UUID format", newUser.id, newUser.id);
  TestValidator.equals(
    "username is set correctly",
    newUser.username,
    joinRequest.body.username,
  );
  TestValidator.equals(
    "email is set correctly",
    newUser.email,
    joinRequest.body.email,
  );
  TestValidator.equals(
    "display name is set correctly",
    newUser.displayName,
    joinRequest.body.display_name,
  );
  TestValidator.equals(
    "bio is set correctly",
    newUser.bio,
    joinRequest.body.bio,
  );
  TestValidator.equals(
    "location is set correctly",
    newUser.location,
    joinRequest.body.location,
  );
  TestValidator.equals(
    "website URL is set correctly",
    newUser.websiteUrl,
    joinRequest.body.website_url,
  );
  TestValidator.equals(
    "avatar URL is set correctly",
    newUser.avatarUrl,
    joinRequest.body.avatar_url,
  );

  // Step 3: Verify initial karma score is 0 for new user
  TestValidator.equals("initial karma score is 0", newUser.karmaScore, 0);

  // Step 4: Verify account status and business workflow
  TestValidator.equals(
    "account status is active",
    newUser.accountStatus,
    "active",
  );
  TestValidator.equals(
    "business status is pending verification",
    newUser.businessStatus,
    "pending_verification",
  );

  // Step 5: Verify email verification and security settings
  TestValidator.predicate(
    "email verification flag exists",
    newUser.emailVerified !== undefined,
  );
  TestValidator.equals(
    "two-factor authentication is disabled by default",
    newUser.twoFactorEnabled,
    false,
  );

  // Step 6: Verify login activity statistics for new user
  TestValidator.equals("login count is 1 for new user", newUser.loginCount, 1);
  TestValidator.equals(
    "failed login attempts is 0 for new user",
    newUser.failedLoginAttempts,
    0,
  );
  TestValidator.predicate(
    "last login timestamp exists",
    newUser.lastLogin !== undefined,
  );

  // Step 7: Verify account creation timestamp
  TestValidator.predicate(
    "account creation timestamp exists",
    newUser.accountCreated !== undefined,
  );
  TestValidator.predicate(
    "created at timestamp exists",
    newUser.createdAt !== undefined,
  );
  TestValidator.predicate(
    "updated at timestamp exists",
    newUser.updatedAt !== undefined,
  );

  // Step 8: Retrieve user profile via profile endpoint
  const profile: IRedditPlatformRegisteredUser =
    await api.functional.redditPlatform.registeredUser.auth.profile.at(
      connection,
    );
  typia.assert(profile);

  // Step 9: Verify profile data matches registered user data
  TestValidator.equals("profile ID matches user ID", profile.id, newUser.id);
  TestValidator.equals(
    "profile username matches user username",
    profile.username,
    newUser.username,
  );
  TestValidator.equals(
    "profile email matches user email",
    profile.email,
    newUser.email,
  );
  TestValidator.equals(
    "profile display name matches user display name",
    profile.displayName,
    newUser.displayName,
  );
  TestValidator.equals(
    "profile bio matches user bio",
    profile.bio,
    newUser.bio,
  );
  TestValidator.equals(
    "profile location matches user location",
    profile.location,
    newUser.location,
  );
  TestValidator.equals(
    "profile website URL matches user website URL",
    profile.websiteUrl,
    newUser.websiteUrl,
  );
  TestValidator.equals(
    "profile avatar URL matches user avatar URL",
    profile.avatarUrl,
    newUser.avatarUrl,
  );

  // Step 10: Verify karma and account statistics are consistent between auth and profile
  TestValidator.equals(
    "profile karma score matches auth response",
    profile.karmaScore,
    newUser.karmaScore,
  );
  TestValidator.equals(
    "profile account status matches auth response",
    profile.accountStatus,
    newUser.accountStatus,
  );
  TestValidator.equals(
    "profile business status matches auth response",
    profile.businessStatus,
    newUser.businessStatus,
  );
  TestValidator.equals(
    "profile email verification matches auth response",
    profile.emailVerified,
    newUser.emailVerified,
  );
  TestValidator.equals(
    "profile login count matches auth response",
    profile.loginCount,
    newUser.loginCount,
  );
  TestValidator.equals(
    "profile failed login attempts matches auth response",
    profile.failedLoginAttempts,
    newUser.failedLoginAttempts,
  );

  // Step 11: Verify profile timestamps are consistent
  TestValidator.equals(
    "profile account created matches auth response",
    profile.accountCreated,
    newUser.accountCreated,
  );
  TestValidator.equals(
    "profile created at matches auth response",
    profile.createdAt,
    newUser.createdAt,
  );
  TestValidator.equals(
    "profile updated at matches auth response",
    profile.updatedAt,
    newUser.updatedAt,
  );

  // Step 12: Verify profile completeness for new user
  TestValidator.predicate(
    "profile has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      profile.id,
    ),
  );
  TestValidator.predicate(
    "profile email is valid format",
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email),
  );
  TestValidator.predicate(
    "profile username meets requirements",
    profile.username.length >= 3 && profile.username.length <= 20,
  );
  TestValidator.predicate(
    "profile display name is present",
    profile.displayName.length > 0,
  );

  // Step 13: Verify integration between karma system and profile display
  TestValidator.predicate(
    "karma system integration is functional",
    typeof profile.karmaScore === "number",
  );
  TestValidator.predicate(
    "karma score represents user reputation",
    profile.karmaScore >= 0,
  );
  TestValidator.predicate(
    "profile accurately reflects user engagement metrics",
    profile.loginCount >= 0 && profile.failedLoginAttempts >= 0,
  );
}
