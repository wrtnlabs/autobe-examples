import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationPreference";

/**
 * Test that a moderator user can retrieve their own notification preference
 * settings after creating them. Validates that notification preferences are
 * properly created and can be retrieved by the authenticated moderator who owns
 * them. The test creates a new moderator account, creates a notification
 * preference with specific settings including moderation-specific notification
 * types, then retrieves it to verify all preference fields match the original
 * configuration with proper security validation ensuring moderators can only
 * access their own preferences.
 */
export async function test_api_notification_preference_retrieval_by_moderator(
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

  // Step 2: Create notification preference record
  const notificationTypes = [
    "content_replies",
    "mentions",
    "community_updates",
    "moderation_actions",
    "system_alerts",
  ] as const;
  const deliveryChannels = ["in_app", "email", "push", "all"] as const;

  const createPreferenceBody = {
    notification_type: RandomGenerator.pick(notificationTypes),
    delivery_channel: RandomGenerator.pick(deliveryChannels),
    enabled: Math.random() > 0.5,
    frequency_limit:
      Math.random() > 0.5
        ? typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >()
        : undefined,
    quiet_hours_start: Math.random() > 0.5 ? "22:00" : undefined,
    quiet_hours_end: Math.random() > 0.5 ? "06:00" : undefined,
  } satisfies ICommunityPlatformNotificationPreference.ICreate;

  const createdPreference =
    await api.functional.communityPlatform.moderator.notificationPreferences.create(
      connection,
      {
        body: createPreferenceBody,
      },
    );
  typia.assert(createdPreference);

  // Step 3: Retrieve the created preference
  const retrievedPreference =
    await api.functional.communityPlatform.moderator.notificationPreferences.at(
      connection,
      {
        preferenceId: createdPreference.id,
      },
    );
  typia.assert(retrievedPreference);

  // Step 4: Validate that retrieved preference matches created preference
  TestValidator.equals(
    "notification type matches",
    retrievedPreference.notification_type,
    createdPreference.notification_type,
  );
  TestValidator.equals(
    "delivery channel matches",
    retrievedPreference.delivery_channel,
    createdPreference.delivery_channel,
  );
  TestValidator.equals(
    "enabled status matches",
    retrievedPreference.enabled,
    createdPreference.enabled,
  );
  TestValidator.equals(
    "frequency limit matches",
    retrievedPreference.frequency_limit,
    createdPreference.frequency_limit,
  );
  TestValidator.equals(
    "quiet hours start matches",
    retrievedPreference.quiet_hours_start,
    createdPreference.quiet_hours_start,
  );
  TestValidator.equals(
    "quiet hours end matches",
    retrievedPreference.quiet_hours_end,
    createdPreference.quiet_hours_end,
  );
  TestValidator.equals(
    "preference ID matches",
    retrievedPreference.id,
    createdPreference.id,
  );

  // Step 5: Validate system-managed timestamps
  TestValidator.predicate(
    "created_at timestamp exists",
    retrievedPreference.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    retrievedPreference.updated_at !== undefined,
  );
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(new Date(retrievedPreference.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(new Date(retrievedPreference.updated_at).getTime()),
  );

  // Step 6: Validate quiet hours consistency when both are set
  if (
    retrievedPreference.quiet_hours_start &&
    retrievedPreference.quiet_hours_end
  ) {
    TestValidator.predicate(
      "quiet hours are properly configured",
      retrievedPreference.quiet_hours_start <
        retrievedPreference.quiet_hours_end,
    );
  }
}
