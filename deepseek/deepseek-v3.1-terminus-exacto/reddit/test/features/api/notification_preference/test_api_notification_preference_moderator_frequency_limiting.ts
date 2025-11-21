import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationPreference";

/**
 * Test notification preference creation with frequency limiting settings for
 * moderators.
 *
 * This E2E test validates that moderators can create notification preferences
 * with frequency limiting capabilities to control notification volume. The test
 * covers creating a moderator account, authenticating, and setting up
 * preferences with various frequency limits and quiet hours configurations.
 *
 * Key test scenarios:
 *
 * - Moderator account creation and authentication flow
 * - Notification preference creation with frequency limits
 * - Validation of optional frequency limiting fields
 * - Quiet hours configuration testing
 * - Data integrity verification of created preferences
 */
export async function test_api_notification_preference_moderator_frequency_limiting(
  connection: api.IConnection,
) {
  // Create moderator account for testing
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

  // Create notification preference with frequency limiting
  const frequencyLimitValue = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const preferenceWithFrequencyLimit =
    await api.functional.communityPlatform.moderator.notificationPreferences.create(
      connection,
      {
        body: {
          notification_type: "content_replies",
          delivery_channel: "in_app",
          enabled: true,
          frequency_limit: frequencyLimitValue,
          quiet_hours_start: "22:00",
          quiet_hours_end: "06:00",
        } satisfies ICommunityPlatformNotificationPreference.ICreate,
      },
    );
  typia.assert(preferenceWithFrequencyLimit);

  // Validate frequency limit was stored correctly
  TestValidator.equals(
    "frequency limit should match input",
    preferenceWithFrequencyLimit.frequency_limit,
    frequencyLimitValue,
  );

  // Validate quiet hours were stored correctly
  TestValidator.equals(
    "quiet hours start should match input",
    preferenceWithFrequencyLimit.quiet_hours_start,
    "22:00",
  );
  TestValidator.equals(
    "quiet hours end should match input",
    preferenceWithFrequencyLimit.quiet_hours_end,
    "06:00",
  );

  // Create another preference without frequency limiting (optional field)
  const preferenceWithoutFrequencyLimit =
    await api.functional.communityPlatform.moderator.notificationPreferences.create(
      connection,
      {
        body: {
          notification_type: "system_alerts",
          delivery_channel: "email",
          enabled: true,
          // frequency_limit intentionally omitted to test optional field
        } satisfies ICommunityPlatformNotificationPreference.ICreate,
      },
    );
  typia.assert(preferenceWithoutFrequencyLimit);

  // Validate that frequency_limit is undefined when not provided
  TestValidator.equals(
    "frequency limit should be undefined when not provided",
    preferenceWithoutFrequencyLimit.frequency_limit,
    undefined,
  );

  // Create preference with different notification type and channel
  const preferenceAllChannels =
    await api.functional.communityPlatform.moderator.notificationPreferences.create(
      connection,
      {
        body: {
          notification_type: "community_updates",
          delivery_channel: "all",
          enabled: false,
          frequency_limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies ICommunityPlatformNotificationPreference.ICreate,
      },
    );
  typia.assert(preferenceAllChannels);

  // Validate disabled preference
  TestValidator.predicate(
    "disabled preference should have enabled=false",
    preferenceAllChannels.enabled === false,
  );

  // Validate all preferences have unique IDs
  TestValidator.notEquals(
    "preference IDs should be unique",
    preferenceWithFrequencyLimit.id,
    preferenceWithoutFrequencyLimit.id,
  );
  TestValidator.notEquals(
    "preference IDs should be unique",
    preferenceWithFrequencyLimit.id,
    preferenceAllChannels.id,
  );
  TestValidator.notEquals(
    "preference IDs should be unique",
    preferenceWithoutFrequencyLimit.id,
    preferenceAllChannels.id,
  );

  // Validate timestamps are set correctly
  TestValidator.predicate(
    "created_at should be set",
    preferenceWithFrequencyLimit.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at should be set",
    preferenceWithFrequencyLimit.updated_at !== undefined,
  );
}
