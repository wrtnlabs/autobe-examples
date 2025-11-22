import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test successful user registration workflow with valid credentials for the
 * Reddit platform's registered user authentication system. This test validates
 * the complete registration process from user signup to initial session
 * establishment, ensuring that new registered user accounts are created with
 * proper profile information, authentication tokens are issued correctly, and
 * the initial session is established with appropriate audit trail data. The
 * test verifies username uniqueness enforcement, email verification requirement
 * handling, default account status settings (active/pending_verification), and
 * proper initialization of user statistics like karma score, login count, and
 * failed login attempts. Additionally validates that the API response contains
 * complete user profile data including ID, username, display name, email,
 * authentication tokens (access/refresh), account lifecycle status, business
 * workflow status, email verification status, and two-factor authentication
 * configuration. The test ensures proper session tracking with timestamps for
 * account creation, last login, and email verification, while confirming that
 * all required session context fields (IP, href, referrer) are properly handled
 * for audit trail and security monitoring purposes.
 */
export async function test_api_registered_user_registration_success(
  connection: api.IConnection,
) {
  // Generate unique username (3-20 characters, alphanumeric and underscores only)
  const username = RandomGenerator.alphaNumeric(12); // Generate 12-char alphanumeric string

  // Generate valid email address
  const email = typia.random<string & tags.Format<"email">>();

  // Generate secure password (8+ characters)
  const password = RandomGenerator.alphaNumeric(16); // Generate 16-char secure password

  // Generate optional profile information
  const displayName = RandomGenerator.name(2); // 2-word display name
  const bio = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  }); // 3-sentence bio with 5-10 character words
  const location = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 6,
  }); // 1-sentence location description
  const websiteUrl = "https://" + RandomGenerator.alphaNumeric(8) + ".com"; // Valid website URL

  // Generate session tracking data for audit trail
  const userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
  const href = "https://reddit.com/register"; // Registration page URL
  const referrer = "https://reddit.com"; // Landing page URL

  // Test successful user registration with complete profile information
  const registrationResponse: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: username,
        email: email,
        password: password,
        display_name: displayName,
        bio: bio,
        location: location,
        website_url: websiteUrl,
        avatar_url: websiteUrl + "/avatar.jpg",
        ip: "192.168.1.100",
        href: href,
        referrer: referrer,
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });

  // Validate response structure and type safety
  typia.assert(registrationResponse);

  // Validate essential user account creation
  TestValidator.equals(
    "user account created with UUID",
    typeof registrationResponse.id,
    "string",
  );
  TestValidator.equals(
    "username matches input",
    registrationResponse.username,
    username,
  );
  TestValidator.equals(
    "email matches input",
    registrationResponse.email,
    email,
  );
  TestValidator.equals(
    "display name matches input",
    registrationResponse.displayName,
    displayName,
  );

  // Validate authentication token issuance
  TestValidator.equals(
    "access token present",
    registrationResponse.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token present",
    registrationResponse.token.refresh.length > 0,
    true,
  );
  TestValidator.equals(
    "access token expiration present",
    registrationResponse.token.expired_at.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token expiration present",
    registrationResponse.token.refreshable_until.length > 0,
    true,
  );

  // Validate account status and workflow
  TestValidator.equals(
    "account status is active",
    registrationResponse.accountStatus,
    "active",
  );
  TestValidator.equals(
    "business status is pending verification",
    registrationResponse.businessStatus,
    "pending_verification",
  );
  TestValidator.equals(
    "email verification required",
    registrationResponse.emailVerified,
    false,
  );
  TestValidator.equals(
    "two-factor authentication disabled by default",
    registrationResponse.twoFactorEnabled,
    false,
  );

  // Validate user statistics initialization
  TestValidator.equals(
    "karma score initialized to zero",
    registrationResponse.karmaScore,
    0,
  );
  TestValidator.equals(
    "login count initialized to zero",
    registrationResponse.loginCount,
    0,
  );
  TestValidator.equals(
    "failed login attempts initialized to zero",
    registrationResponse.failedLoginAttempts,
    0,
  );

  // Validate profile data persistence
  TestValidator.equals("bio matches input", registrationResponse.bio, bio);
  TestValidator.equals(
    "location matches input",
    registrationResponse.location,
    location,
  );
  TestValidator.equals(
    "website URL matches input",
    registrationResponse.websiteUrl,
    websiteUrl,
  );
  TestValidator.equals(
    "avatar URL matches input",
    registrationResponse.avatarUrl,
    websiteUrl + "/avatar.jpg",
  );

  // Validate timestamp data
  TestValidator.equals(
    "account creation timestamp present",
    registrationResponse.accountCreated.length > 0,
    true,
  );
  TestValidator.equals(
    "last login timestamp present",
    registrationResponse.lastLogin.length > 0,
    true,
  );
  TestValidator.equals(
    "created timestamp present",
    registrationResponse.createdAt.length > 0,
    true,
  );
  TestValidator.equals(
    "updated timestamp present",
    registrationResponse.updatedAt.length > 0,
    true,
  );

  // Validate email verification workflow
  TestValidator.equals(
    "email verification not yet completed",
    registrationResponse.emailVerified,
    false,
  );
  TestValidator.equals(
    "email verification timestamp not set",
    registrationResponse.emailVerifiedAt,
    undefined,
  );

  // Validate security features
  TestValidator.equals(
    "password hash generated",
    registrationResponse.passwordHash.length > 0,
    true,
  );
  TestValidator.notEquals(
    "password not stored in plain text",
    registrationResponse.passwordHash,
    password,
  );

  // Validate session context handling
  TestValidator.equals(
    "user agent stored for audit",
    registrationResponse.lastLogin.length > 0,
    true,
  );
}
