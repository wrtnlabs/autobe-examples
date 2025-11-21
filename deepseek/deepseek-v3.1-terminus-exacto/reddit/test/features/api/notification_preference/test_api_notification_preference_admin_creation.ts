import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationPreference";

/**
 * Test that an administrator can create comprehensive notification preferences
 * with full administrative privileges. Validates that admin-level preference
 * creation includes all available notification types and delivery channels,
 * ensuring administrators have complete control over their notification
 * experience across all platform features.
 */
export async function test_api_notification_preference_admin_creation(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for testing notification preference creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create comprehensive notification preference with admin privileges
  const notificationTypes = [
    "content_replies",
    "mentions",
    "community_updates",
    "moderation_actions",
    "system_alerts",
  ] as const;
  const deliveryChannels = ["in_app", "email", "push", "all"] as const;

  const notificationType = RandomGenerator.pick(notificationTypes);
  const deliveryChannel = RandomGenerator.pick(deliveryChannels);

  const preference =
    await api.functional.communityPlatform.admin.notificationPreferences.create(
      connection,
      {
        body: {
          notification_type: notificationType,
          delivery_channel: deliveryChannel,
          enabled: true,
          frequency_limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >() satisfies number | undefined as number | undefined,
          quiet_hours_start: typia.random<
            string & tags.Pattern<"^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$">
          >() satisfies string | undefined as string | undefined,
          quiet_hours_end: typia.random<
            string & tags.Pattern<"^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$">
          >() satisfies string | undefined as string | undefined,
        } satisfies ICommunityPlatformNotificationPreference.ICreate,
      },
    );
  typia.assert(preference);

  // Step 3: Validate the created preference matches the input
  TestValidator.equals(
    "notification type matches input",
    preference.notification_type,
    notificationType,
  );
  TestValidator.equals(
    "delivery channel matches input",
    preference.delivery_channel,
    deliveryChannel,
  );
  TestValidator.equals(
    "enabled status matches input",
    preference.enabled,
    true,
  );
}
