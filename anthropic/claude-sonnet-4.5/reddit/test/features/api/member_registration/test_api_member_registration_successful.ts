import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test successful member account registration with complete profile
 * information.
 *
 * This test validates the end-to-end member registration flow including:
 *
 * 1. Creating a new member account with valid credentials and profile data
 * 2. Verifying the response contains complete member profile information
 * 3. Confirming JWT authentication tokens are issued (access and refresh)
 * 4. Validating initial state: karma scores at zero, email unverified
 * 5. Checking privacy settings match provided values or defaults
 * 6. Ensuring timestamps are properly set and formatted
 *
 * The registration process creates a new record in reddit_community_members
 * table, hashes the password securely, initializes karma tracking fields to
 * zero, and returns authentication tokens for immediate platform access.
 */
export async function test_api_member_registration_successful(
  connection: api.IConnection,
) {
  // Generate unique registration data
  const username = RandomGenerator.alphaNumeric(12);
  const email = `${RandomGenerator.alphaNumeric(8)}@test.example.com`;
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name(2);
  const bio = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const avatarUrl = `https://cdn.example.com/avatars/${RandomGenerator.alphaNumeric(8)}.jpg`;

  // Prepare registration request body
  const registrationData = {
    username: username,
    email: email,
    password: password,
    display_name: displayName,
    bio: bio,
    avatar_url: avatarUrl,
    show_online_status: false,
    show_subscribed_communities: false,
    show_activity_feed: true,
    ip: null,
    href: "https://reddit-community.example.com/register",
    referrer: "https://reddit-community.example.com/home",
  } satisfies IRedditCommunityGuest.ICreate;

  // Execute registration
  const registeredMember = await api.functional.auth.member.join(connection, {
    body: registrationData,
  });

  // Validate response structure and types
  typia.assert(registeredMember);

  // Verify basic member information
  TestValidator.equals(
    "registered username matches input username",
    registeredMember.username,
    username,
  );
  TestValidator.equals(
    "registered email matches input email",
    registeredMember.email,
    email,
  );
  TestValidator.equals(
    "display name matches input display name",
    registeredMember.display_name,
    displayName,
  );
  TestValidator.equals("bio matches input bio", registeredMember.bio, bio);
  TestValidator.equals(
    "avatar URL matches input avatar URL",
    registeredMember.avatar_url,
    avatarUrl,
  );

  // Verify initial karma scores are zero
  TestValidator.equals(
    "post karma initialized to zero",
    registeredMember.post_karma,
    0,
  );
  TestValidator.equals(
    "comment karma initialized to zero",
    registeredMember.comment_karma,
    0,
  );

  // Verify email verification status
  TestValidator.equals(
    "email verification status is false initially",
    registeredMember.email_verified,
    false,
  );

  // Verify privacy settings
  TestValidator.equals(
    "show online status setting matches input",
    registeredMember.show_online_status,
    false,
  );
  TestValidator.equals(
    "show subscribed communities setting matches input",
    registeredMember.show_subscribed_communities,
    false,
  );
  TestValidator.equals(
    "show activity feed setting matches input",
    registeredMember.show_activity_feed,
    true,
  );

  // Verify timestamps are set
  TestValidator.predicate(
    "created_at timestamp is set and non-empty",
    registeredMember.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp is set and non-empty",
    registeredMember.updated_at.length > 0,
  );

  // Verify JWT tokens are present
  TestValidator.predicate(
    "access token is present and non-empty",
    registeredMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present and non-empty",
    registeredMember.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expired_at is set",
    registeredMember.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh token refreshable_until is set",
    registeredMember.token.refreshable_until.length > 0,
  );

  // Verify member ID is valid UUID format
  TestValidator.predicate(
    "member id is valid and non-empty",
    registeredMember.id.length > 0,
  );
}
