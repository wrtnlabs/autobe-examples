import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationPreference";

/**
 * Test that a moderator can create multiple notification preferences for
 * different delivery channels (in_app, email, push, all) within the same
 * notification type. This validates the granular control moderators have over
 * notification delivery and ensures the system properly handles multiple
 * preference records for the same user and notification type combination.
 */
export async function test_api_notification_preference_moderator_multiple_channels(
  connection: api.IConnection,
) {
  // Create moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        display_name: RandomGenerator.paragraph({ sentences: 2 }),
        moderator_level: "community",
        is_active: true,
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Define notification type and delivery channels to test
  const notificationType = "content_replies";
  const deliveryChannels = ["in_app", "email", "push", "all"] as const;

  // Create multiple notification preferences for the same notification type
  const createdPreferences: ICommunityPlatformNotificationPreference[] = [];

  for (const deliveryChannel of deliveryChannels) {
    const preference: ICommunityPlatformNotificationPreference =
      await api.functional.communityPlatform.moderator.notificationPreferences.create(
        connection,
        {
          body: {
            notification_type: notificationType,
            delivery_channel: deliveryChannel,
            enabled: true,
            frequency_limit: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0>
            >(),
            quiet_hours_start: "22:00",
            quiet_hours_end: "08:00",
          } satisfies ICommunityPlatformNotificationPreference.ICreate,
        },
      );
    typia.assert(preference);

    // Validate the created preference has correct properties
    TestValidator.equals(
      "notification type matches",
      preference.notification_type,
      notificationType,
    );
    TestValidator.equals(
      "delivery channel matches",
      preference.delivery_channel,
      deliveryChannel,
    );
    TestValidator.predicate("preference is enabled", preference.enabled);

    createdPreferences.push(preference);
  }

  // Validate that all preferences were created successfully
  TestValidator.equals(
    "all preferences created",
    createdPreferences.length,
    deliveryChannels.length,
  );

  // Validate that each preference has unique ID
  const preferenceIds = createdPreferences.map((p) => p.id);
  const uniqueIds = new Set(preferenceIds);
  TestValidator.equals(
    "all preference IDs are unique",
    uniqueIds.size,
    preferenceIds.length,
  );

  // Validate that all preferences have the same notification type but different delivery channels
  const uniqueNotificationTypes = new Set(
    createdPreferences.map((p) => p.notification_type),
  );
  TestValidator.equals(
    "all preferences have same notification type",
    uniqueNotificationTypes.size,
    1,
  );
  TestValidator.equals(
    "notification type is correct",
    Array.from(uniqueNotificationTypes)[0],
    notificationType,
  );

  const uniqueDeliveryChannels = new Set(
    createdPreferences.map((p) => p.delivery_channel),
  );
  TestValidator.equals(
    "all delivery channels are unique",
    uniqueDeliveryChannels.size,
    deliveryChannels.length,
  );

  // Validate timestamps are properly set
  for (const preference of createdPreferences) {
    TestValidator.predicate(
      "created_at is valid date",
      new Date(preference.created_at).getTime() > 0,
    );
    TestValidator.predicate(
      "updated_at is valid date",
      new Date(preference.updated_at).getTime() > 0,
    );
  }
}
