import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationPreference";

/**
 * Test the complete lifecycle of notification preference management where a
 * member creates a custom notification preference and then deletes it.
 * Validates that members can properly manage their notification settings by
 * creating personalized preferences for specific notification types and
 * delivery channels, then removing them when no longer needed.
 */
export async function test_api_notification_preference_deletion_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://community-platform.example.com/register",
      referrer: "https://community-platform.example.com",
      ip: "192.168.1.1",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create notification preference to be deleted
  const notificationTypes = [
    "content_replies",
    "mentions",
    "community_updates",
    "moderation_actions",
    "system_alerts",
  ] as const;
  const deliveryChannels = ["in_app", "email", "push", "all"] as const;

  const preferenceData = {
    notification_type: RandomGenerator.pick(notificationTypes),
    delivery_channel: RandomGenerator.pick(deliveryChannels),
    enabled: Math.random() > 0.5,
    frequency_limit:
      Math.random() > 0.5
        ? typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>()
        : undefined,
    quiet_hours_start: Math.random() > 0.5 ? "22:00" : undefined,
    quiet_hours_end: Math.random() > 0.5 ? "07:00" : undefined,
  } satisfies ICommunityPlatformNotificationPreference.ICreate;

  const createdPreference =
    await api.functional.communityPlatform.member.notificationPreferences.create(
      connection,
      { body: preferenceData },
    );
  typia.assert(createdPreference);

  // Validate created preference matches input data
  TestValidator.equals(
    "notification type matches",
    createdPreference.notification_type,
    preferenceData.notification_type,
  );
  TestValidator.equals(
    "delivery channel matches",
    createdPreference.delivery_channel,
    preferenceData.delivery_channel,
  );
  TestValidator.equals(
    "enabled status matches",
    createdPreference.enabled,
    preferenceData.enabled,
  );

  // Step 3: Delete the notification preference
  await api.functional.communityPlatform.member.notificationPreferences.erase(
    connection,
    { preferenceId: createdPreference.id },
  );

  // Step 4: Create a second preference to demonstrate the functionality works for multiple preferences
  const secondPreferenceData = {
    notification_type: RandomGenerator.pick(notificationTypes),
    delivery_channel: RandomGenerator.pick(deliveryChannels),
    enabled: true,
    frequency_limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
  } satisfies ICommunityPlatformNotificationPreference.ICreate;

  const secondPreference =
    await api.functional.communityPlatform.member.notificationPreferences.create(
      connection,
      { body: secondPreferenceData },
    );
  typia.assert(secondPreference);

  await api.functional.communityPlatform.member.notificationPreferences.erase(
    connection,
    { preferenceId: secondPreference.id },
  );

  // Final validation: All operations completed successfully
  TestValidator.predicate(
    "notification preference lifecycle test completed successfully",
    true,
  );
}
