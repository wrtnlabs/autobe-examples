import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationPreference";

/**
 * Test notification preference creation for moderators with various
 * configurations.
 *
 * This comprehensive test validates that moderators can customize notification
 * settings including different notification types, delivery channels, frequency
 * limits, and quiet hours. The test ensures proper authentication context and
 * validates business rules for preference creation including uniqueness
 * constraints and proper moderator association.
 */
export async function test_api_notification_preference_moderator_creation(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for authentication context
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      display_name: RandomGenerator.name(),
      moderator_level: "community",
      is_active: true,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Test various notification preference configurations
  const notificationTypes = [
    "content_replies",
    "mentions",
    "community_updates",
    "moderation_actions",
    "system_alerts",
  ] as const;
  const deliveryChannels = ["in_app", "email", "push", "all"] as const;

  // Test case 1: Basic preference creation with all channels
  for (const notificationType of notificationTypes) {
    for (const deliveryChannel of deliveryChannels) {
      const preference =
        await api.functional.communityPlatform.moderator.notificationPreferences.create(
          connection,
          {
            body: {
              notification_type: notificationType,
              delivery_channel: deliveryChannel,
              enabled: true,
            } satisfies ICommunityPlatformNotificationPreference.ICreate,
          },
        );
      typia.assert(preference);

      TestValidator.equals(
        "notification type should match input",
        preference.notification_type,
        notificationType,
      );
      TestValidator.equals(
        "delivery channel should match input",
        preference.delivery_channel,
        deliveryChannel,
      );
      TestValidator.predicate(
        "preference should be enabled",
        preference.enabled,
      );
    }
  }

  // Test case 2: Preference with frequency limit
  const frequencyPreference =
    await api.functional.communityPlatform.moderator.notificationPreferences.create(
      connection,
      {
        body: {
          notification_type: RandomGenerator.pick(notificationTypes),
          delivery_channel: RandomGenerator.pick(deliveryChannels),
          enabled: true,
          frequency_limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies ICommunityPlatformNotificationPreference.ICreate,
      },
    );
  typia.assert(frequencyPreference);
  TestValidator.predicate(
    "frequency limit should be set",
    frequencyPreference.frequency_limit !== undefined,
  );

  // Test case 3: Preference with quiet hours
  const quietHoursPreference =
    await api.functional.communityPlatform.moderator.notificationPreferences.create(
      connection,
      {
        body: {
          notification_type: RandomGenerator.pick(notificationTypes),
          delivery_channel: RandomGenerator.pick(deliveryChannels),
          enabled: true,
          quiet_hours_start: "22:00",
          quiet_hours_end: "06:00",
        } satisfies ICommunityPlatformNotificationPreference.ICreate,
      },
    );
  typia.assert(quietHoursPreference);
  TestValidator.equals(
    "quiet hours start should be set",
    quietHoursPreference.quiet_hours_start,
    "22:00",
  );
  TestValidator.equals(
    "quiet hours end should be set",
    quietHoursPreference.quiet_hours_end,
    "06:00",
  );

  // Test case 4: Disabled preference
  const disabledPreference =
    await api.functional.communityPlatform.moderator.notificationPreferences.create(
      connection,
      {
        body: {
          notification_type: RandomGenerator.pick(notificationTypes),
          delivery_channel: RandomGenerator.pick(deliveryChannels),
          enabled: false,
        } satisfies ICommunityPlatformNotificationPreference.ICreate,
      },
    );
  typia.assert(disabledPreference);
  TestValidator.predicate(
    "preference should be disabled",
    !disabledPreference.enabled,
  );

  // Test case 5: Complex preference with all options
  const complexPreference =
    await api.functional.communityPlatform.moderator.notificationPreferences.create(
      connection,
      {
        body: {
          notification_type: "system_alerts",
          delivery_channel: "all",
          enabled: true,
          frequency_limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
          >(),
          quiet_hours_start: "23:00",
          quiet_hours_end: "07:00",
        } satisfies ICommunityPlatformNotificationPreference.ICreate,
      },
    );
  typia.assert(complexPreference);

  // Validate all properties are properly set
  TestValidator.equals(
    "notification type should be system_alerts",
    complexPreference.notification_type,
    "system_alerts",
  );
  TestValidator.equals(
    "delivery channel should be all",
    complexPreference.delivery_channel,
    "all",
  );
  TestValidator.predicate(
    "preference should be enabled",
    complexPreference.enabled,
  );
  TestValidator.predicate(
    "frequency limit should be set",
    complexPreference.frequency_limit !== undefined,
  );
  TestValidator.equals(
    "quiet hours start should be 23:00",
    complexPreference.quiet_hours_start,
    "23:00",
  );
  TestValidator.equals(
    "quiet hours end should be 07:00",
    complexPreference.quiet_hours_end,
    "07:00",
  );

  // Test case 6: Uniqueness constraint validation
  const duplicatePreferenceBody = {
    notification_type: "content_replies",
    delivery_channel: "email",
    enabled: true,
  } satisfies ICommunityPlatformNotificationPreference.ICreate;

  // First creation should succeed
  const firstPreference =
    await api.functional.communityPlatform.moderator.notificationPreferences.create(
      connection,
      { body: duplicatePreferenceBody },
    );
  typia.assert(firstPreference);

  // Second creation with same parameters should fail due to uniqueness constraint
  await TestValidator.error(
    "duplicate preference creation should fail",
    async () => {
      await api.functional.communityPlatform.moderator.notificationPreferences.create(
        connection,
        { body: duplicatePreferenceBody },
      );
    },
  );
}
