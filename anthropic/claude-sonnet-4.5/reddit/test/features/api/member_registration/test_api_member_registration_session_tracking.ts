import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test that registration creates proper session tracking records.
 *
 * This test validates the member registration process by verifying that:
 *
 * 1. A new member can successfully register with valid credentials
 * 2. The registration response contains proper authentication tokens
 * 3. Session tracking information (href, referrer) is accepted and processed
 * 4. The system handles optional IP address field correctly
 *
 * The test ensures that the reddit_community_member_sessions table receives
 * proper connection context data for security monitoring and analytics
 * purposes.
 */
export async function test_api_member_registration_session_tracking(
  connection: api.IConnection,
) {
  // Generate realistic registration data with session tracking information
  const registrationData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    show_online_status: false,
    show_subscribed_communities: false,
    show_activity_feed: true,
    ip: "192.168.1.100",
    href: "https://reddit-community.example.com/register",
    referrer: "https://reddit-community.example.com/welcome",
  } satisfies IRedditCommunityGuest.ICreate;

  // Register the new member with session tracking data
  const registeredMember: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });

  // Validate the registration response structure
  typia.assert(registeredMember);

  // Verify that basic member information is correctly created
  TestValidator.equals(
    "registered username matches input",
    registeredMember.username,
    registrationData.username,
  );

  TestValidator.equals(
    "registered email matches input",
    registeredMember.email,
    registrationData.email,
  );

  TestValidator.equals(
    "display name matches input",
    registeredMember.display_name,
    registrationData.display_name,
  );

  TestValidator.equals(
    "bio matches input",
    registeredMember.bio,
    registrationData.bio,
  );

  TestValidator.equals(
    "avatar URL matches input",
    registeredMember.avatar_url,
    registrationData.avatar_url,
  );

  // Verify privacy settings are correctly set
  TestValidator.equals(
    "show_online_status setting matches",
    registeredMember.show_online_status,
    registrationData.show_online_status,
  );

  TestValidator.equals(
    "show_subscribed_communities setting matches",
    registeredMember.show_subscribed_communities,
    registrationData.show_subscribed_communities,
  );

  TestValidator.equals(
    "show_activity_feed setting matches",
    registeredMember.show_activity_feed,
    registrationData.show_activity_feed,
  );

  // Verify that email is initially not verified
  TestValidator.equals(
    "email not verified initially",
    registeredMember.email_verified,
    false,
  );

  // Verify karma scores are initialized to zero
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

  // Verify authentication token is provided
  typia.assert<IAuthorizationToken>(registeredMember.token);

  TestValidator.predicate(
    "access token is non-empty string",
    registeredMember.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token is non-empty string",
    registeredMember.token.refresh.length > 0,
  );

  // Verify token expiration times are in the future
  const now = new Date();
  const expiredAt = new Date(registeredMember.token.expired_at);
  const refreshableUntil = new Date(registeredMember.token.refreshable_until);

  TestValidator.predicate(
    "access token expires in the future",
    expiredAt > now,
  );

  TestValidator.predicate(
    "refresh token is refreshable in the future",
    refreshableUntil > now,
  );

  // Verify that created_at and updated_at timestamps are present and valid
  TestValidator.predicate(
    "created_at timestamp is valid",
    new Date(registeredMember.created_at) <= new Date(),
  );

  TestValidator.predicate(
    "updated_at timestamp is valid",
    new Date(registeredMember.updated_at) <= new Date(),
  );

  // Test registration without optional IP field to verify server-side extraction
  const registrationDataNoIp = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://reddit-community.example.com/join",
    referrer: "https://reddit-community.example.com/home",
  } satisfies IRedditCommunityGuest.ICreate;

  const memberWithoutIp: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationDataNoIp,
    });

  // Validate successful registration without explicit IP
  typia.assert(memberWithoutIp);

  TestValidator.equals(
    "username matches for registration without IP",
    memberWithoutIp.username,
    registrationDataNoIp.username,
  );

  TestValidator.predicate(
    "access token provided for registration without IP",
    memberWithoutIp.token.access.length > 0,
  );
}
