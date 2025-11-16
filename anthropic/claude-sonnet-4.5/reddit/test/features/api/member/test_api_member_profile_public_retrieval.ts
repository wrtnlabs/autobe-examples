import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test that any user (guest or authenticated) can retrieve a member's public
 * profile information by username.
 *
 * This test validates the public accessibility of member profiles, ensuring
 * that the platform supports transparent member discovery and reputation
 * viewing without requiring authentication.
 *
 * Steps:
 *
 * 1. Create a member account with complete profile information
 * 2. Create an unauthenticated connection (guest access)
 * 3. Retrieve the member's public profile by username
 * 4. Validate all public profile fields are present and correct
 * 5. Verify karma scores are initialized to 0 for new members
 */
export async function test_api_member_profile_public_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create a member account with full profile information
  const username = RandomGenerator.name(1).toLowerCase().replace(/\s/g, "_");
  const email = typia.random<string & tags.Format<"email">>();
  const displayName = RandomGenerator.name(2);
  const bio = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const avatarUrl = typia.random<string & tags.Format<"uri">>();

  const registrationData = {
    username: username,
    email: email,
    password: "SecurePass123!",
    display_name: displayName,
    bio: bio,
    avatar_url: avatarUrl,
    show_online_status: false,
    show_subscribed_communities: false,
    show_activity_feed: true,
    href: "https://example.com/register",
    referrer: "https://example.com/home",
  } satisfies IRedditCommunityGuest.ICreate;

  const createdMember: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });
  typia.assert(createdMember);

  // Step 2: Create an unauthenticated connection (guest access)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 3: Retrieve the member's public profile by username without authentication
  const publicProfile: IRedditCommunityGuest.ISummary =
    await api.functional.redditCommunity.members.at(unauthenticatedConnection, {
      username: username,
    });
  typia.assert(publicProfile);

  // Step 4: Validate all public profile fields are present and correct
  TestValidator.equals(
    "profile id matches",
    publicProfile.id,
    createdMember.id,
  );
  TestValidator.equals(
    "profile username matches",
    publicProfile.username,
    username,
  );
  TestValidator.equals(
    "profile display_name matches",
    publicProfile.display_name,
    displayName,
  );
  TestValidator.equals("profile bio matches", publicProfile.bio, bio);
  TestValidator.equals(
    "profile avatar_url matches",
    publicProfile.avatar_url,
    avatarUrl,
  );

  // Step 5: Verify karma scores are initialized to 0 for new members
  TestValidator.equals(
    "post_karma initialized to 0",
    publicProfile.post_karma,
    0,
  );
  TestValidator.equals(
    "comment_karma initialized to 0",
    publicProfile.comment_karma,
    0,
  );

  // Verify created_at timestamp exists and is valid
  TestValidator.predicate(
    "created_at timestamp is valid",
    publicProfile.created_at === createdMember.created_at,
  );
}
