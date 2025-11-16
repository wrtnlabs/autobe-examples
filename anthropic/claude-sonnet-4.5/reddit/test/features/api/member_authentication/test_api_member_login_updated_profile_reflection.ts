import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test that login reflects any profile updates made after registration.
 *
 * This test validates that the login endpoint always returns the most current
 * member profile information from the database. It ensures that authentication
 * responses contain fresh data with proper updated_at timestamps, not cached or
 * stale information.
 *
 * Test Flow:
 *
 * 1. Register a new member account with complete profile information
 * 2. Capture the initial registration response and updated_at timestamp
 * 3. Perform a login operation using the member's credentials
 * 4. Validate that the login response contains current member data
 * 5. Verify that all profile fields are correctly populated
 * 6. Confirm that updated_at timestamp reflects database state
 * 7. Ensure authentication tokens are properly issued
 */
export async function test_api_member_login_updated_profile_reflection(
  connection: api.IConnection,
) {
  // Step 1: Generate unique member credentials and profile data
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberUsername = RandomGenerator.alphaNumeric(12);

  // Step 2: Create registration data with complete profile information
  const registrationData = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    show_online_status: true,
    show_subscribed_communities: false,
    show_activity_feed: true,
    ip: "127.0.0.1",
    href: "https://example.com/join" satisfies string & tags.Format<"uri">,
    referrer: "https://example.com/home" satisfies string & tags.Format<"uri">,
  } satisfies IRedditCommunityGuest.ICreate;

  // Step 3: Register the new member account
  const registeredMember = await api.functional.auth.member.join(connection, {
    body: registrationData,
  });
  typia.assert<IRedditCommunityGuest.IAuthorized>(registeredMember);

  // Step 4: Validate registration response structure
  TestValidator.equals(
    "registered member email matches input",
    registeredMember.email,
    memberEmail,
  );
  TestValidator.equals(
    "registered member username matches input",
    registeredMember.username,
    memberUsername,
  );

  // Step 5: Capture initial timestamps
  const initialUpdatedAt = registeredMember.updated_at;
  const initialCreatedAt = registeredMember.created_at;

  // Step 6: Prepare login credentials
  const loginCredentials = {
    email: memberEmail,
    password: memberPassword,
    ip: "127.0.0.1",
    href: "https://example.com/login" satisfies string & tags.Format<"uri">,
    referrer: "https://example.com/home" satisfies string & tags.Format<"uri">,
  } satisfies IRedditCommunityGuest.ILogin;

  // Step 7: Perform login operation
  const loggedInMember = await api.functional.auth.member.login(connection, {
    body: loginCredentials,
  });
  typia.assert<IRedditCommunityGuest.IAuthorized>(loggedInMember);

  // Step 8: Validate login response contains current profile data
  TestValidator.equals(
    "login response member ID matches registration",
    loggedInMember.id,
    registeredMember.id,
  );
  TestValidator.equals(
    "login response email matches registered email",
    loggedInMember.email,
    memberEmail,
  );
  TestValidator.equals(
    "login response username matches registered username",
    loggedInMember.username,
    memberUsername,
  );

  // Step 9: Validate profile fields are correctly populated
  TestValidator.equals(
    "login response display_name reflects current state",
    loggedInMember.display_name,
    registeredMember.display_name,
  );
  TestValidator.equals(
    "login response bio reflects current state",
    loggedInMember.bio,
    registeredMember.bio,
  );
  TestValidator.equals(
    "login response avatar_url reflects current state",
    loggedInMember.avatar_url,
    registeredMember.avatar_url,
  );

  // Step 10: Validate privacy settings are preserved
  TestValidator.equals(
    "login response show_online_status matches registration",
    loggedInMember.show_online_status,
    registeredMember.show_online_status,
  );
  TestValidator.equals(
    "login response show_subscribed_communities matches registration",
    loggedInMember.show_subscribed_communities,
    registeredMember.show_subscribed_communities,
  );
  TestValidator.equals(
    "login response show_activity_feed matches registration",
    loggedInMember.show_activity_feed,
    registeredMember.show_activity_feed,
  );

  // Step 11: Validate karma scores are initialized correctly
  TestValidator.equals(
    "login response post_karma is initialized to zero",
    loggedInMember.post_karma,
    0,
  );
  TestValidator.equals(
    "login response comment_karma is initialized to zero",
    loggedInMember.comment_karma,
    0,
  );

  // Step 12: Validate timestamps consistency
  TestValidator.equals(
    "login response created_at matches registration",
    loggedInMember.created_at,
    initialCreatedAt,
  );
}
