import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberPreference";

/**
 * Test retrieving member preferences after customizing multiple settings.
 *
 * A member joins the platform, updates their preferences to customize
 * notification frequency to 'weekly', disables post and comment upvote
 * notifications, sets their profile to private, restricts direct messages to
 * followers only, and enables activity status visibility. The test then
 * retrieves the preferences and verifies that all custom values are correctly
 * persisted and returned.
 *
 * Steps:
 *
 * 1. Create a new member account through registration
 * 2. Update member preferences with custom settings (notification frequency,
 *    visibility, messaging)
 * 3. Retrieve the member's preferences
 * 4. Verify all updated preference values are correctly stored and returned
 */
export async function test_api_member_preferences_retrieve_custom_settings(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const memberCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8),
    password: "SecurePass123!",
    ip: "192.168.1.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const memberResponse = await api.functional.auth.member.join(connection, {
    body: memberCreateBody,
  });
  typia.assert(memberResponse);

  const memberId = memberResponse.id;
  TestValidator.predicate(
    "member registration successful",
    memberId !== null && memberId !== undefined,
  );

  // Step 2: Update member preferences with custom settings
  const updatePreferencesBody = {
    notification_frequency: "weekly" as const,
    notify_on_post_upvotes: false,
    notify_on_comment_upvotes: false,
    show_profile_publicly: false,
    allow_direct_messages: "followers_only" as const,
    show_activity_status: true,
  } satisfies ICommunityPlatformMemberPreference.IUpdate;

  const updatedPreferences =
    await api.functional.communityPlatform.member.members.preferences.update(
      connection,
      {
        memberId: memberId,
        body: updatePreferencesBody,
      },
    );
  typia.assert(updatedPreferences);

  // Verify the update was applied
  TestValidator.equals(
    "notification frequency updated to weekly",
    updatedPreferences.notification_frequency,
    "weekly",
  );
  TestValidator.equals(
    "post upvote notifications disabled",
    updatedPreferences.notify_on_post_upvotes,
    false,
  );
  TestValidator.equals(
    "comment upvote notifications disabled",
    updatedPreferences.notify_on_comment_upvotes,
    false,
  );
  TestValidator.equals(
    "profile set to private",
    updatedPreferences.show_profile_publicly,
    false,
  );
  TestValidator.equals(
    "direct messages restricted to followers only",
    updatedPreferences.allow_direct_messages,
    "followers_only",
  );
  TestValidator.equals(
    "activity status enabled",
    updatedPreferences.show_activity_status,
    true,
  );

  // Step 3: Retrieve member preferences
  const retrievedPreferences =
    await api.functional.communityPlatform.member.members.preferences.at(
      connection,
      {
        memberId: memberId,
      },
    );
  typia.assert(retrievedPreferences);

  // Step 4: Verify all custom values are correctly persisted and returned
  TestValidator.equals(
    "retrieved notification frequency is weekly",
    retrievedPreferences.notification_frequency,
    "weekly",
  );
  TestValidator.equals(
    "retrieved post upvote notification is disabled",
    retrievedPreferences.notify_on_post_upvotes,
    false,
  );
  TestValidator.equals(
    "retrieved comment upvote notification is disabled",
    retrievedPreferences.notify_on_comment_upvotes,
    false,
  );
  TestValidator.equals(
    "retrieved profile visibility is private",
    retrievedPreferences.show_profile_publicly,
    false,
  );
  TestValidator.equals(
    "retrieved direct message permission is followers_only",
    retrievedPreferences.allow_direct_messages,
    "followers_only",
  );
  TestValidator.equals(
    "retrieved activity status is enabled",
    retrievedPreferences.show_activity_status,
    true,
  );

  // Verify member ID correspondence
  TestValidator.equals(
    "retrieved preferences belong to the correct member",
    retrievedPreferences.community_platform_member_id,
    memberId,
  );
}
