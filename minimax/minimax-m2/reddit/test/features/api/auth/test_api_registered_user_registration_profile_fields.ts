import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test user registration with comprehensive profile information including
 * display name, bio, location, website URL, and avatar. Validates that optional
 * profile fields are properly stored and associated with the user account for
 * social features and community engagement.
 */
export async function test_api_registered_user_registration_profile_fields(
  connection: api.IConnection,
) {
  // Generate comprehensive test data for user registration with full profile information
  const username = RandomGenerator.alphaNumeric(10);
  const email = `${RandomGenerator.alphaNumeric(8)}@test.com`;
  const password = "SecurePass123!";
  const href = "https://reddit-platform.example.com/register";
  const referrer = "https://reddit-platform.example.com/home";
  const ip = "192.168.1.100";

  // Generate optional profile information for social features
  const displayName = RandomGenerator.name(2);
  const bio = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 8,
    wordMax: 15,
  });
  const location = RandomGenerator.name(1) + ", " + RandomGenerator.name(1);
  const websiteUrl = `https://${RandomGenerator.alphaNumeric(8)}.example.com`;
  const avatarUrl = `https://cdn.example.com/avatars/${RandomGenerator.alphaNumeric(12)}.jpg`;

  // Execute user registration with comprehensive profile data
  const user = await api.functional.auth.registeredUser.join(connection, {
    body: {
      username,
      email,
      password,
      display_name: displayName,
      bio,
      location,
      website_url: websiteUrl,
      avatar_url: avatarUrl,
      ip,
      href,
      referrer,
    } satisfies IRedditPlatformRegisteredUser.ICreate,
  });

  // Validate complete response structure and type safety
  typia.assert(user);

  // Verify user account creation and basic fields
  TestValidator.equals("username matches input", user.username, username);
  TestValidator.equals("email matches input", user.email, email);
  TestValidator.equals(
    "display name matches input",
    user.displayName,
    displayName,
  );
  TestValidator.equals("bio matches input", user.bio ?? "", bio);
  TestValidator.equals("location matches input", user.location ?? "", location);
  TestValidator.equals(
    "website URL matches input",
    user.websiteUrl ?? "",
    websiteUrl,
  );
  TestValidator.equals(
    "avatar URL matches input",
    user.avatarUrl ?? "",
    avatarUrl,
  );

  // Validate account initialization values for new users
  TestValidator.equals("karma score initialized to zero", user.karmaScore, 0);
  TestValidator.equals(
    "account status is active",
    user.accountStatus,
    "active",
  );
  TestValidator.equals(
    "business status is pending verification",
    user.businessStatus,
    "pending_verification",
  );
  TestValidator.equals(
    "email verified status is false",
    user.emailVerified,
    false,
  );
  TestValidator.equals(
    "two factor enabled is false",
    user.twoFactorEnabled,
    false,
  );
  TestValidator.equals("login count initialized to zero", user.loginCount, 0);
  TestValidator.equals(
    "failed login attempts initialized to zero",
    user.failedLoginAttempts,
    0,
  );

  // Verify authentication token is provided
  TestValidator.predicate(
    "authentication token exists",
    user.token !== undefined && user.token !== null,
  );
  TestValidator.predicate(
    "access token is valid string",
    typeof user.token.access === "string" && user.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is valid string",
    typeof user.token.refresh === "string" && user.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expiration is valid date",
    user.token.expired_at !== undefined && user.token.expired_at !== null,
  );
  TestValidator.predicate(
    "refreshable until is valid date",
    user.token.refreshable_until !== undefined &&
      user.token.refreshable_until !== null,
  );

  // Validate profile data is ready for social features
  TestValidator.predicate(
    "profile is complete for social engagement",
    user.displayName.length > 0,
  );
  TestValidator.predicate(
    "bio enables community connection",
    user.bio !== undefined && user.bio !== null && user.bio.length > 0,
  );
  TestValidator.predicate(
    "location allows community discovery",
    user.location !== undefined &&
      user.location !== null &&
      user.location.length > 0,
  );
  TestValidator.predicate(
    "avatar enables user identification",
    user.avatarUrl !== undefined &&
      user.avatarUrl !== null &&
      user.avatarUrl.length > 0,
  );

  // Verify timestamp fields are present and valid
  TestValidator.predicate(
    "account creation timestamp exists",
    user.accountCreated !== undefined,
  );
  TestValidator.predicate(
    "last login timestamp exists",
    user.lastLogin !== undefined,
  );
  TestValidator.predicate(
    "created at timestamp exists",
    user.createdAt !== undefined,
  );
  TestValidator.predicate(
    "updated at timestamp exists",
    user.updatedAt !== undefined,
  );
}
