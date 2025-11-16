import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test successful member login using username and password.
 *
 * This test validates the member authentication flow using username-based
 * login. First, a new member account is created through the join endpoint.
 * Then, the test authenticates using the username (not email) and password
 * combination.
 *
 * The test verifies that:
 *
 * 1. Login endpoint validates credentials correctly
 * 2. JWT tokens (access and refresh) are returned
 * 3. Token structure matches IAuthorizationToken with proper expiration timestamps
 * 4. Complete member profile is included in the response
 * 5. Profile data matches the registration information
 */
export async function test_api_member_login_with_username(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const testUsername = RandomGenerator.alphaNumeric(12);
  const testEmail = `${RandomGenerator.alphaNumeric(8)}@test.com`;
  const testPassword = RandomGenerator.alphaNumeric(16);
  const testHref = "https://reddit-community.test/auth/join";
  const testReferrer = "https://reddit-community.test/";

  const registrationData = {
    username: testUsername,
    email: testEmail,
    password: testPassword,
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    avatar_url: "https://example.com/avatar.png",
    show_online_status: true,
    show_subscribed_communities: false,
    show_activity_feed: true,
    ip: "192.168.1.100",
    href: testHref,
    referrer: testReferrer,
  } satisfies IRedditCommunityGuest.ICreate;

  const registeredMember: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });
  typia.assert(registeredMember);

  // Step 2: Login using username and password
  const loginData = {
    username: testUsername,
    password: testPassword,
    href: "https://reddit-community.test/auth/login",
    referrer: "https://reddit-community.test/",
  } satisfies IRedditCommunityGuest.ILogin;

  const authenticatedMember: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: loginData,
    });
  typia.assert(authenticatedMember);

  // Step 3: Validate member profile matches registration
  TestValidator.equals(
    "username should match",
    authenticatedMember.username,
    testUsername,
  );
  TestValidator.equals(
    "email should match",
    authenticatedMember.email,
    testEmail,
  );
  TestValidator.equals(
    "display_name should match",
    authenticatedMember.display_name,
    registrationData.display_name,
  );
  TestValidator.equals(
    "bio should match",
    authenticatedMember.bio,
    registrationData.bio,
  );
  TestValidator.equals(
    "avatar_url should match",
    authenticatedMember.avatar_url,
    registrationData.avatar_url,
  );

  // Step 4: Validate privacy settings
  TestValidator.equals(
    "show_online_status should match",
    authenticatedMember.show_online_status,
    registrationData.show_online_status,
  );
  TestValidator.equals(
    "show_subscribed_communities should match",
    authenticatedMember.show_subscribed_communities,
    registrationData.show_subscribed_communities,
  );
  TestValidator.equals(
    "show_activity_feed should match",
    authenticatedMember.show_activity_feed,
    registrationData.show_activity_feed,
  );

  // Step 5: Validate karma scores initialized to zero
  TestValidator.equals(
    "post_karma should be zero",
    authenticatedMember.post_karma,
    0,
  );
  TestValidator.equals(
    "comment_karma should be zero",
    authenticatedMember.comment_karma,
    0,
  );
}
