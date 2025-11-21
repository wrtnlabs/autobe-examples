import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationPreference";

/**
 * Test comprehensive notification preference creation for administrators
 * covering all available settings including multiple notification types,
 * delivery channel combinations, frequency limits, and quiet hour
 * configurations. Validates that administrators have the most granular control
 * over their notification experience.
 */
export async function test_api_notification_preference_admin_comprehensive_settings(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Test comprehensive notification preference creation
  const notificationTypes = [
    "content_replies",
    "mentions",
    "community_updates",
    "moderation_actions",
    "system_alerts",
  ] as const;
  const deliveryChannels = ["in_app", "email", "push", "all"] as const;

  // Test a representative subset to avoid excessive API calls
  const testCombinations = [
    {
      notificationType: "content_replies",
      deliveryChannel: "in_app",
      enabled: true,
    },
    { notificationType: "mentions", deliveryChannel: "email", enabled: false },
    {
      notificationType: "community_updates",
      deliveryChannel: "push",
      enabled: true,
    },
    {
      notificationType: "moderation_actions",
      deliveryChannel: "all",
      enabled: false,
    },
    {
      notificationType: "system_alerts",
      deliveryChannel: "in_app",
      enabled: true,
    },
  ];

  for (const combination of testCombinations) {
    // Create preference with comprehensive settings
    const preferenceData = {
      notification_type: combination.notificationType,
      delivery_channel: combination.deliveryChannel,
      enabled: combination.enabled,
      frequency_limit: combination.enabled
        ? typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>()
        : undefined,
      quiet_hours_start: combination.enabled
        ? ("22:00" satisfies string as string)
        : undefined,
      quiet_hours_end: combination.enabled
        ? ("07:00" satisfies string as string)
        : undefined,
    } satisfies ICommunityPlatformNotificationPreference.ICreate;

    const preference: ICommunityPlatformNotificationPreference =
      await api.functional.communityPlatform.admin.notificationPreferences.create(
        connection,
        {
          body: preferenceData,
        },
      );
    typia.assert(preference);

    // Validate response matches input
    await TestValidator.equals(
      "notification type matches",
      preference.notification_type,
      combination.notificationType,
    );
    await TestValidator.equals(
      "delivery channel matches",
      preference.delivery_channel,
      combination.deliveryChannel,
    );
    await TestValidator.equals(
      "enabled status matches",
      preference.enabled,
      combination.enabled,
    );

    if (preferenceData.frequency_limit !== undefined) {
      await TestValidator.equals(
        "frequency limit matches",
        preference.frequency_limit,
        preferenceData.frequency_limit,
      );
    }

    if (
      preferenceData.quiet_hours_start !== undefined &&
      preferenceData.quiet_hours_end !== undefined
    ) {
      await TestValidator.equals(
        "quiet hours start matches",
        preference.quiet_hours_start,
        preferenceData.quiet_hours_start,
      );
      await TestValidator.equals(
        "quiet hours end matches",
        preference.quiet_hours_end,
        preferenceData.quiet_hours_end,
      );
    }
  }

  // Step 3: Test edge cases with specific configurations
  // Test frequency limit edge cases
  const frequencyEdgeCases = [
    { frequency_limit: 0 }, // Minimum value
    { frequency_limit: 100 }, // Moderate value
    { frequency_limit: 1000 }, // High value
  ];

  for (const edgeCase of frequencyEdgeCases) {
    const edgeCasePreference: ICommunityPlatformNotificationPreference =
      await api.functional.communityPlatform.admin.notificationPreferences.create(
        connection,
        {
          body: {
            notification_type: "system_alerts",
            delivery_channel: "all",
            enabled: true,
            frequency_limit: edgeCase.frequency_limit,
          } satisfies ICommunityPlatformNotificationPreference.ICreate,
        },
      );
    typia.assert(edgeCasePreference);
    await TestValidator.equals(
      "frequency limit edge case",
      edgeCasePreference.frequency_limit,
      edgeCase.frequency_limit,
    );
  }

  // Test quiet hour configurations
  const quietHourConfigs = [
    { start: "00:00", end: "06:00" }, // Early morning
    { start: "22:00", end: "08:00" }, // Overnight
    { start: "12:00", end: "13:00" }, // Lunch break
  ];

  for (const config of quietHourConfigs) {
    const quietHourPreference: ICommunityPlatformNotificationPreference =
      await api.functional.communityPlatform.admin.notificationPreferences.create(
        connection,
        {
          body: {
            notification_type: "content_replies",
            delivery_channel: "email",
            enabled: true,
            quiet_hours_start: config.start satisfies string as string,
            quiet_hours_end: config.end satisfies string as string,
          } satisfies ICommunityPlatformNotificationPreference.ICreate,
        },
      );
    typia.assert(quietHourPreference);
    await TestValidator.equals(
      "quiet hours start edge case",
      quietHourPreference.quiet_hours_start,
      config.start,
    );
    await TestValidator.equals(
      "quiet hours end edge case",
      quietHourPreference.quiet_hours_end,
      config.end,
    );
  }
}
