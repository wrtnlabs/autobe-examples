import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test that login returns accurate and complete member profile data.
 *
 * This test validates that the login endpoint returns all profile fields
 * accurately by first registering a member with specific profile data
 * (display_name, bio, avatar_url, privacy settings), then logging in with those
 * credentials and verifying that all profile fields in the login response match
 * the registered data exactly. The test confirms that karma scores are
 * initialized to zero, email verification status is set correctly, and all
 * timestamps are properly generated.
 *
 * Steps:
 *
 * 1. Register a new member account with complete profile data including
 *    display_name, bio, avatar_url, and all privacy settings
 * 2. Capture the registration response containing the initial member profile
 * 3. Login with the same credentials
 * 4. Verify that the login response contains the exact same profile data as
 *    registration
 * 5. Confirm that karma scores (post_karma, comment_karma) are both zero
 * 6. Validate that email_verified status is false for new accounts
 * 7. Ensure that created_at and updated_at timestamps are present and valid
 */
export async function test_api_member_login_profile_data_accuracy(
  connection: api.IConnection,
) {
  // Step 1: Prepare registration data with complete profile information
  const username = RandomGenerator.alphaNumeric(12);
  const email =
    `${RandomGenerator.alphaNumeric(10)}@example.com` satisfies string &
      tags.Format<"email">;
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name(2);
  const bio = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const avatarUrl =
    `https://example.com/avatars/${RandomGenerator.alphaNumeric(8)}.jpg` satisfies string &
      tags.Format<"uri">;
  const showOnlineStatus = RandomGenerator.pick([true, false] as const);
  const showSubscribedCommunities = RandomGenerator.pick([
    true,
    false,
  ] as const);
  const showActivityFeed = RandomGenerator.pick([true, false] as const);

  const registrationBody = {
    username: username,
    email: email,
    password: password,
    display_name: displayName,
    bio: bio,
    avatar_url: avatarUrl,
    show_online_status: showOnlineStatus,
    show_subscribed_communities: showSubscribedCommunities,
    show_activity_feed: showActivityFeed,
    href: "https://example.com/register" satisfies string & tags.Format<"uri">,
    referrer: "https://example.com/" satisfies string & tags.Format<"uri">,
  } satisfies IRedditCommunityGuest.ICreate;

  // Step 2: Register the new member account
  const registeredMember: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationBody,
    });
  typia.assert(registeredMember);

  // Step 3: Login with the registered credentials
  const loginBody = {
    username: username,
    password: password,
    href: "https://example.com/login" satisfies string & tags.Format<"uri">,
    referrer: "https://example.com/" satisfies string & tags.Format<"uri">,
  } satisfies IRedditCommunityGuest.ILogin;

  const loggedInMember: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInMember);

  // Step 4: Verify that login response profile data matches registration response
  TestValidator.equals(
    "member ID matches",
    loggedInMember.id,
    registeredMember.id,
  );
  TestValidator.equals(
    "username matches",
    loggedInMember.username,
    registeredMember.username,
  );
  TestValidator.equals(
    "email matches",
    loggedInMember.email,
    registeredMember.email,
  );
  TestValidator.equals(
    "display_name matches",
    loggedInMember.display_name,
    registeredMember.display_name,
  );
  TestValidator.equals("bio matches", loggedInMember.bio, registeredMember.bio);
  TestValidator.equals(
    "avatar_url matches",
    loggedInMember.avatar_url,
    registeredMember.avatar_url,
  );

  // Step 5: Verify privacy settings match
  TestValidator.equals(
    "show_online_status matches",
    loggedInMember.show_online_status,
    registeredMember.show_online_status,
  );
  TestValidator.equals(
    "show_subscribed_communities matches",
    loggedInMember.show_subscribed_communities,
    registeredMember.show_subscribed_communities,
  );
  TestValidator.equals(
    "show_activity_feed matches",
    loggedInMember.show_activity_feed,
    registeredMember.show_activity_feed,
  );

  // Step 6: Verify karma scores are zero for new accounts
  TestValidator.equals("post_karma is zero", loggedInMember.post_karma, 0);
  TestValidator.equals(
    "comment_karma is zero",
    loggedInMember.comment_karma,
    0,
  );

  // Step 7: Verify email verification status
  TestValidator.equals(
    "email_verified is false for new account",
    loggedInMember.email_verified,
    false,
  );

  // Step 8: Verify timestamps are present and match
  TestValidator.equals(
    "created_at matches",
    loggedInMember.created_at,
    registeredMember.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    loggedInMember.updated_at,
    registeredMember.updated_at,
  );

  // Step 9: Verify that the exact profile data provided during registration is preserved
  TestValidator.equals(
    "display_name matches input",
    loggedInMember.display_name,
    displayName,
  );
  TestValidator.equals("bio matches input", loggedInMember.bio, bio);
  TestValidator.equals(
    "avatar_url matches input",
    loggedInMember.avatar_url,
    avatarUrl,
  );
  TestValidator.equals(
    "show_online_status matches input",
    loggedInMember.show_online_status,
    showOnlineStatus,
  );
  TestValidator.equals(
    "show_subscribed_communities matches input",
    loggedInMember.show_subscribed_communities,
    showSubscribedCommunities,
  );
  TestValidator.equals(
    "show_activity_feed matches input",
    loggedInMember.show_activity_feed,
    showActivityFeed,
  );
}
