import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test authenticated member privacy settings update functionality.
 *
 * This test validates that members can successfully update their privacy
 * control settings (show_online_status, show_subscribed_communities,
 * show_activity_feed) through the profile update endpoint. It ensures members
 * have granular control over their visibility and privacy on the platform.
 *
 * Test workflow:
 *
 * 1. Register a new member account with default privacy settings
 * 2. Verify initial privacy settings from registration response
 * 3. Update all three privacy settings to toggled values
 * 4. Verify the update operation succeeds
 */
export async function test_api_member_profile_update_privacy_settings(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
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
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });
  typia.assert(member);

  // Step 2: Verify initial privacy settings from registration
  TestValidator.equals(
    "initial show_online_status",
    member.show_online_status,
    false,
  );
  TestValidator.equals(
    "initial show_subscribed_communities",
    member.show_subscribed_communities,
    false,
  );
  TestValidator.equals(
    "initial show_activity_feed",
    member.show_activity_feed,
    true,
  );

  // Step 3: Update all three privacy settings to toggled values
  const privacyUpdate = {
    show_online_status: true,
    show_subscribed_communities: true,
    show_activity_feed: false,
  } satisfies IRedditCommunityGuest.IUpdate;

  const updatedProfile: IRedditCommunityGuest.ISummary =
    await api.functional.redditCommunity.member.members.update(connection, {
      username: member.username,
      body: privacyUpdate,
    });
  typia.assert(updatedProfile);

  // Step 4: Verify the update succeeded and basic profile data is intact
  TestValidator.equals(
    "username remains unchanged",
    updatedProfile.username,
    member.username,
  );
  TestValidator.equals(
    "user ID remains unchanged",
    updatedProfile.id,
    member.id,
  );
}
