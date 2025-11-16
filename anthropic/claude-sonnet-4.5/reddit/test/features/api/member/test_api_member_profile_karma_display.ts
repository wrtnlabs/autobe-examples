import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test that karma scores are correctly displayed in public member profiles.
 *
 * This test validates the reputation system's transparency by ensuring karma
 * metrics (post_karma and comment_karma) are visible to all users. The test
 * verifies that newly created accounts start with zero karma and that these
 * values are included in the profile response.
 *
 * Test Steps:
 *
 * 1. Create a new member account through registration
 * 2. Retrieve the member's public profile using their username
 * 3. Verify that post_karma is initialized to 0
 * 4. Verify that comment_karma is initialized to 0
 * 5. Confirm that both karma fields are present in the response
 */
export async function test_api_member_profile_karma_display(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const username = RandomGenerator.alphaNumeric(10);
  const email = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const password = RandomGenerator.alphaNumeric(12);

  const registrationData = {
    username: username,
    email: email,
    password: password,
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
    avatar_url: `https://example.com/avatar/${RandomGenerator.alphaNumeric(8)}.png`,
    show_online_status: false,
    show_subscribed_communities: false,
    show_activity_feed: true,
    ip: "192.168.1.100",
    href: "https://redditcommunity.example.com/join",
    referrer: "https://google.com",
  } satisfies IRedditCommunityGuest.ICreate;

  const authorizedMember: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });

  typia.assert(authorizedMember);

  // Step 2: Retrieve the member's public profile
  const publicProfile: IRedditCommunityGuest.ISummary =
    await api.functional.redditCommunity.members.at(connection, {
      username: username,
    });

  typia.assert(publicProfile);

  // Step 3: Verify that post_karma is initialized to 0
  TestValidator.equals(
    "post_karma should be initialized to 0 for new accounts",
    publicProfile.post_karma,
    0,
  );

  // Step 4: Verify that comment_karma is initialized to 0
  TestValidator.equals(
    "comment_karma should be initialized to 0 for new accounts",
    publicProfile.comment_karma,
    0,
  );

  // Step 5: Verify the username matches
  TestValidator.equals(
    "retrieved profile username should match created username",
    publicProfile.username,
    username,
  );

  // Additional validation: Verify the profile ID matches
  TestValidator.equals(
    "retrieved profile ID should match authorized member ID",
    publicProfile.id,
    authorizedMember.id,
  );
}
