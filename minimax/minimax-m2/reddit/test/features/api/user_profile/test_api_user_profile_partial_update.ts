import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test partial profile update scenarios for registered Reddit platform users.
 *
 * Validates that when only specific profile fields are updated (display name
 * and bio), all other profile information remains intact and unchanged. This
 * ensures data integrity and proper partial update functionality.
 *
 * Test Flow:
 *
 * 1. Create a registered user with comprehensive profile information
 * 2. Document initial profile state for comparison
 * 3. Perform partial update targeting only display_name and bio
 * 4. Verify updated fields contain new values
 * 5. Confirm unchanged fields remain identical to initial state
 * 6. Validate complete profile data integrity
 */
export async function test_api_user_profile_partial_update(
  connection: api.IConnection,
) {
  // Step 1: Create a new registered user with comprehensive profile data
  const userEmail = typia.random<string & tags.Format<"email">>();
  const initialUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: userEmail,
        password: "SecurePass123!",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        location: RandomGenerator.paragraph({ sentences: 1 }),
        website_url: `https://example${RandomGenerator.alphaNumeric(4)}.com`,
        avatar_url: `https://avatar.example.com/user${RandomGenerator.alphaNumeric(6)}.jpg`,
        href: "https://reddit-platform.example.com/register",
        referrer: "https://reddit-platform.example.com",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(initialUser);

  // Step 2: Document baseline profile data for integrity verification
  const baselineProfile = {
    id: initialUser.id,
    username: initialUser.username,
    email: initialUser.email,
    passwordHash: initialUser.passwordHash,
    displayName: initialUser.displayName,
    bio: initialUser.bio,
    location: initialUser.location,
    websiteUrl: initialUser.websiteUrl,
    avatarUrl: initialUser.avatarUrl,
    karmaScore: initialUser.karmaScore,
    accountStatus: initialUser.accountStatus,
    businessStatus: initialUser.businessStatus,
    emailVerified: initialUser.emailVerified,
    twoFactorEnabled: initialUser.twoFactorEnabled,
    lastLogin: initialUser.lastLogin,
    loginCount: initialUser.loginCount,
    failedLoginAttempts: initialUser.failedLoginAttempts,
    accountCreated: initialUser.accountCreated,
    emailVerifiedAt: initialUser.emailVerifiedAt,
    suspendedUntil: initialUser.suspendedUntil,
    createdAt: initialUser.createdAt,
    updatedAt: initialUser.updatedAt,
  };

  // Step 3: Perform partial profile update targeting only display_name and bio
  const updatedDisplayName = `Updated ${RandomGenerator.name()}`;
  const updatedBio = RandomGenerator.paragraph({ sentences: 2 });

  const updatedProfile: IRedditPlatformRegisteredUser =
    await api.functional.redditPlatform.registeredUser.auth.profile.update(
      connection,
      {
        body: {
          display_name: updatedDisplayName,
          bio: updatedBio,
        } satisfies IRedditPlatformRegisteredUser.IUpdate,
      },
    );
  typia.assert(updatedProfile);

  // Step 4: Verify that updated fields contain new values
  TestValidator.equals(
    "display name should be updated",
    updatedProfile.displayName,
    updatedDisplayName,
  );
  TestValidator.equals("bio should be updated", updatedProfile.bio, updatedBio);

  // Step 5: Verify unchanged fields remain identical to baseline
  TestValidator.equals(
    "user ID should remain unchanged",
    updatedProfile.id,
    baselineProfile.id,
  );
  TestValidator.equals(
    "username should remain unchanged",
    updatedProfile.username,
    baselineProfile.username,
  );
  TestValidator.equals(
    "email should remain unchanged",
    updatedProfile.email,
    baselineProfile.email,
  );
  TestValidator.equals(
    "password hash should remain unchanged",
    updatedProfile.passwordHash,
    baselineProfile.passwordHash,
  );
  TestValidator.equals(
    "location should remain unchanged",
    updatedProfile.location,
    baselineProfile.location,
  );
  TestValidator.equals(
    "website URL should remain unchanged",
    updatedProfile.websiteUrl,
    baselineProfile.websiteUrl,
  );
  TestValidator.equals(
    "avatar URL should remain unchanged",
    updatedProfile.avatarUrl,
    baselineProfile.avatarUrl,
  );
  TestValidator.equals(
    "karma score should remain unchanged",
    updatedProfile.karmaScore,
    baselineProfile.karmaScore,
  );
  TestValidator.equals(
    "account status should remain unchanged",
    updatedProfile.accountStatus,
    baselineProfile.accountStatus,
  );
  TestValidator.equals(
    "business status should remain unchanged",
    updatedProfile.businessStatus,
    baselineProfile.businessStatus,
  );
  TestValidator.equals(
    "email verified should remain unchanged",
    updatedProfile.emailVerified,
    baselineProfile.emailVerified,
  );
  TestValidator.equals(
    "2FA enabled should remain unchanged",
    updatedProfile.twoFactorEnabled,
    baselineProfile.twoFactorEnabled,
  );
  TestValidator.equals(
    "last login should remain unchanged",
    updatedProfile.lastLogin,
    baselineProfile.lastLogin,
  );
  TestValidator.equals(
    "login count should remain unchanged",
    updatedProfile.loginCount,
    baselineProfile.loginCount,
  );
  TestValidator.equals(
    "failed login attempts should remain unchanged",
    updatedProfile.failedLoginAttempts,
    baselineProfile.failedLoginAttempts,
  );
  TestValidator.equals(
    "account created should remain unchanged",
    updatedProfile.accountCreated,
    baselineProfile.accountCreated,
  );
  TestValidator.equals(
    "email verified at should remain unchanged",
    updatedProfile.emailVerifiedAt,
    baselineProfile.emailVerifiedAt,
  );
  TestValidator.equals(
    "suspended until should remain unchanged",
    updatedProfile.suspendedUntil,
    baselineProfile.suspendedUntil,
  );
  TestValidator.equals(
    "created at should remain unchanged",
    updatedProfile.createdAt,
    baselineProfile.createdAt,
  );

  // Step 6: Verify the updated timestamp reflects the recent update
  TestValidator.predicate(
    "updated timestamp should be newer than creation",
    new Date(updatedProfile.updatedAt).getTime() >
      new Date(baselineProfile.updatedAt).getTime(),
  );

  // Additional validation: Ensure updated timestamp is recent (within reasonable time frame)
  const now = Date.now();
  const updatedTime = new Date(updatedProfile.updatedAt).getTime();
  TestValidator.predicate(
    "update should be recent (within last 5 minutes)",
    now - updatedTime < 5 * 60 * 1000,
  );
}
