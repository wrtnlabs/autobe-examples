import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_email_verification_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new registered user account with pending verification
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "SecurePassword123!";
  const userUsername = RandomGenerator.alphabets(10) + "_test";

  const newUser = await api.functional.auth.registeredUser.join(connection, {
    body: {
      username: userUsername,
      email: userEmail,
      password: userPassword,
      display_name: "Test User Verification",
      bio: "Test user for email verification functionality",
      location: "Test City, Test Country",
      website_url: "https://testuser.example.com",
      avatar_url: "https://example.com/avatar.jpg",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IRedditPlatformRegisteredUser.ICreate,
  });

  typia.assert(newUser);

  // Verify initial state - user should have pending verification
  TestValidator.equals(
    "user account created successfully",
    newUser.username,
    userUsername,
  );
  TestValidator.equals("user email matches input", newUser.email, userEmail);
  TestValidator.predicate(
    "email verification initially false",
    !newUser.emailVerified,
  );
  TestValidator.equals(
    "business status should be pending_verification",
    newUser.businessStatus,
    "pending_verification",
  );
  TestValidator.equals(
    "account status should be active",
    newUser.accountStatus,
    "active",
  );
  TestValidator.predicate(
    "user should have authentication token",
    !!newUser.token.access,
  );

  // Step 2: Generate a realistic email verification token
  // In a real scenario, this would be sent via email and retrieved from the email
  const verificationToken = typia.random<string>();

  // Step 3: Call the email verification endpoint with the valid token
  const verifiedUser =
    await api.functional.auth.registeredUser.email.verify.verifyEmail(
      connection,
      {
        token: verificationToken,
      },
    );

  typia.assert(verifiedUser);

  // Step 4: Validate email verification status is updated to true
  TestValidator.equals(
    "email verification status updated to true",
    verifiedUser.emailVerified,
    true,
  );

  // Step 5: Validate account status changes to 'active'
  TestValidator.equals(
    "business status changed to active",
    verifiedUser.businessStatus,
    "active",
  );
  TestValidator.equals(
    "account status remains active",
    verifiedUser.accountStatus,
    "active",
  );

  // Step 6: Validate user profile data integrity
  TestValidator.equals(
    "username preserved after verification",
    verifiedUser.username,
    userUsername,
  );
  TestValidator.equals(
    "email preserved after verification",
    verifiedUser.email,
    userEmail,
  );
  TestValidator.equals(
    "display name preserved",
    verifiedUser.displayName,
    "Test User Verification",
  );
  TestValidator.equals(
    "bio preserved",
    verifiedUser.bio,
    "Test user for email verification functionality",
  );
  TestValidator.equals(
    "location preserved",
    verifiedUser.location,
    "Test City, Test Country",
  );
  TestValidator.equals(
    "website URL preserved",
    verifiedUser.websiteUrl,
    "https://testuser.example.com",
  );
  TestValidator.equals(
    "avatar URL preserved",
    verifiedUser.avatarUrl,
    "https://example.com/avatar.jpg",
  );

  // Step 7: Validate authentication and access
  TestValidator.predicate(
    "user should have valid authentication token",
    !!verifiedUser.token.access,
  );
  TestValidator.predicate(
    "user should have refresh token",
    !!verifiedUser.token.refresh,
  );
  TestValidator.predicate(
    "token should have expiration time",
    !!verifiedUser.token.expired_at,
  );
  TestValidator.predicate(
    "refresh token should have expiration",
    !!verifiedUser.token.refreshable_until,
  );

  // Step 8: Validate verification timestamp
  TestValidator.predicate(
    "email verification timestamp should be set",
    !!verifiedUser.emailVerifiedAt,
  );

  // Step 9: Validate user statistics
  TestValidator.equals("karma score starts at 0", verifiedUser.karmaScore, 0);
  TestValidator.equals("login count starts at 0", verifiedUser.loginCount, 0);
  TestValidator.predicate(
    "last login should be recent",
    !!verifiedUser.lastLogin,
  );

  // Step 10: Validate timestamp consistency
  TestValidator.predicate(
    "account created timestamp exists",
    !!verifiedUser.accountCreated,
  );
  TestValidator.predicate(
    "created at timestamp exists",
    !!verifiedUser.createdAt,
  );
  TestValidator.predicate(
    "updated at timestamp exists",
    !!verifiedUser.updatedAt,
  );

  // Final validation: user now has full platform access
  TestValidator.predicate(
    "user has full platform access through verified status",
    verifiedUser.emailVerified && verifiedUser.businessStatus === "active",
  );
}
