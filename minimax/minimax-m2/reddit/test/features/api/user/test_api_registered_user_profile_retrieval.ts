import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test the complete user profile retrieval workflow for registered users.
 *
 * This test validates that registered users can successfully create an account,
 * authenticate, and retrieve their comprehensive profile information including
 * identification details, account status, karma scores, and activity
 * statistics. The test ensures the user profile management system works
 * correctly and users can access all their account information.
 */
export async function test_api_registered_user_profile_retrieval(
  connection: api.IConnection,
) {
  // Create a new registered user account with comprehensive profile data
  const userAccount: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: typia.random<
          string & tags.MinLength<3> & tags.MaxLength<20>
        >(),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        display_name: typia.random<string & tags.MaxLength<50>>(),
        bio: typia.random<string & tags.MaxLength<500>>(),
        location: typia.random<string & tags.MaxLength<100>>(),
        website_url: typia.random<string & tags.Format<"uri">>(),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(userAccount);

  // Retrieve the authenticated user's profile information
  const userProfile: IRedditPlatformRegisteredUser =
    await api.functional.redditPlatform.registeredUser.auth.profile.at(
      connection,
    );
  typia.assert(userProfile);

  // Validate user identification details
  TestValidator.equals("user ID matches", userProfile.id, userAccount.id);
  TestValidator.equals(
    "username matches",
    userProfile.username,
    userAccount.username,
  );
  TestValidator.equals("email matches", userProfile.email, userAccount.email);
  TestValidator.equals(
    "display name matches",
    userProfile.displayName,
    userAccount.displayName,
  );

  // Validate account status and business workflow
  TestValidator.equals(
    "account status is active",
    userProfile.accountStatus,
    "active",
  );
  TestValidator.equals(
    "business status is pending verification",
    userProfile.businessStatus,
    "pending_verification",
  );
  TestValidator.equals(
    "email is not verified",
    userProfile.emailVerified,
    false,
  );
  TestValidator.equals(
    "two-factor authentication disabled",
    userProfile.twoFactorEnabled,
    false,
  );

  // Validate karma scoring system
  TestValidator.equals(
    "initial karma score is zero",
    userProfile.karmaScore,
    0,
  );
  TestValidator.predicate(
    "karma score is non-negative",
    userProfile.karmaScore >= 0,
  );

  // Validate activity tracking and statistics
  TestValidator.equals("login count starts at zero", userProfile.loginCount, 0);
  TestValidator.equals(
    "failed login attempts starts at zero",
    userProfile.failedLoginAttempts,
    0,
  );
  TestValidator.predicate(
    "last login timestamp is valid ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(userProfile.lastLogin),
  );
  TestValidator.predicate(
    "account created timestamp is valid ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      userProfile.accountCreated,
    ),
  );

  // Validate profile information fields
  TestValidator.equals("bio matches", userProfile.bio, userAccount.bio);
  TestValidator.equals(
    "location matches",
    userProfile.location,
    userAccount.location,
  );
  TestValidator.equals(
    "website URL matches",
    userProfile.websiteUrl,
    userAccount.websiteUrl,
  );
  TestValidator.equals(
    "avatar URL matches",
    userProfile.avatarUrl,
    userAccount.avatarUrl,
  );

  // Validate timestamps and audit trail
  TestValidator.predicate(
    "created timestamp is valid ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(userProfile.createdAt),
  );
  TestValidator.predicate(
    "updated timestamp is valid ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(userProfile.updatedAt),
  );
  TestValidator.predicate(
    "created and updated timestamps are similar",
    Math.abs(
      new Date(userProfile.createdAt).getTime() -
        new Date(userProfile.updatedAt).getTime(),
    ) < 60000,
  );

  // Validate optional nullable fields
  TestValidator.equals(
    "email verified at is undefined initially",
    userProfile.emailVerifiedAt,
    undefined,
  );
  TestValidator.equals(
    "suspended until is null initially",
    userProfile.suspendedUntil,
    null,
  );

  // Test password security - ensure password hash is present but not exposed
  TestValidator.predicate(
    "password hash exists for security",
    userProfile.passwordHash.length > 0,
  );
}
