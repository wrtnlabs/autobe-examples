import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test that newly registered member profiles show correct initial state with
 * zero activity metrics.
 *
 * This test validates that new member accounts start with properly initialized
 * karma and activity counts. The test creates a new member account and
 * immediately retrieves the profile to verify initial values. The profile
 * should show zero total posts, zero total comments, zero post karma, zero
 * comment karma, and zero total karma. This confirms that the registration
 * process correctly initializes all activity tracking fields and that profile
 * retrieval accurately reflects the new account state without any prior
 * activity.
 *
 * Test Flow:
 *
 * 1. Create a fresh member account with valid registration data
 * 2. Retrieve the member's profile using their username
 * 3. Verify all activity metrics are initialized to zero
 */
export async function test_api_member_profile_initial_state(
  connection: api.IConnection,
) {
  // Step 1: Create a fresh member account
  const registrationData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    show_online_status: false,
    show_subscribed_communities: false,
    show_activity_feed: true,
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const newMember: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });
  typia.assert(newMember);

  // Step 2: Retrieve the member's profile
  const profile: IRedditCommunityGuest =
    await api.functional.redditCommunity.members.profile.at(connection, {
      username: newMember.username,
    });
  typia.assert(profile);

  // Step 3: Verify all activity metrics are initialized to zero
  TestValidator.equals("total_posts should be zero", profile.total_posts, 0);
  TestValidator.equals(
    "total_comments should be zero",
    profile.total_comments,
    0,
  );
  TestValidator.equals("post_karma should be zero", profile.post_karma, 0);
  TestValidator.equals(
    "comment_karma should be zero",
    profile.comment_karma,
    0,
  );
  TestValidator.equals("total_karma should be zero", profile.total_karma, 0);
}
