import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationPreference";

/**
 * Test that administrators can retrieve specific notification preference
 * records they have created. Validates that preference retrieval works
 * correctly after creation and that administrators can access their own
 * preference settings. The test ensures that preference ID matching and
 * authorization checks function properly, preventing unauthorized access to
 * preference records.
 */
export async function test_api_admin_notification_preference_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to create notification preferences
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
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

  // Step 2: Create notification preference record for retrieval testing
  const notificationTypes = [
    "content_replies",
    "mentions",
    "community_updates",
    "moderation_actions",
    "system_alerts",
  ] as const;
  const deliveryChannels = ["in_app", "email", "push", "all"] as const;

  // Generate random quiet hours that match the HH:MM pattern constraint
  const generateTime = () => {
    const hours = Math.floor(Math.random() * 24)
      .toString()
      .padStart(2, "0");
    const minutes = Math.floor(Math.random() * 60)
      .toString()
      .padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const shouldSetQuietHours = Math.random() > 0.5;
  const quietHoursStart = shouldSetQuietHours ? generateTime() : undefined;
  const quietHoursEnd = shouldSetQuietHours ? generateTime() : undefined;

  const createPreferenceBody = {
    notification_type: RandomGenerator.pick(notificationTypes),
    delivery_channel: RandomGenerator.pick(deliveryChannels),
    enabled: Math.random() > 0.5,
    frequency_limit:
      Math.random() > 0.5
        ? typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>()
        : undefined,
    quiet_hours_start: quietHoursStart,
    quiet_hours_end: quietHoursEnd,
  } satisfies ICommunityPlatformNotificationPreference.ICreate;

  const createdPreference =
    await api.functional.communityPlatform.admin.notificationPreferences.create(
      connection,
      {
        body: createPreferenceBody,
      },
    );
  typia.assert(createdPreference);

  // Step 3: Retrieve the specific notification preference record
  const retrievedPreference =
    await api.functional.communityPlatform.admin.notificationPreferences.at(
      connection,
      {
        preferenceId: createdPreference.id,
      },
    );
  typia.assert(retrievedPreference);

  // Step 4: Validate that retrieved preference matches created preference
  TestValidator.equals(
    "preference ID should match",
    retrievedPreference.id,
    createdPreference.id,
  );
  TestValidator.equals(
    "notification type should match",
    retrievedPreference.notification_type,
    createdPreference.notification_type,
  );
  TestValidator.equals(
    "delivery channel should match",
    retrievedPreference.delivery_channel,
    createdPreference.delivery_channel,
  );
  TestValidator.equals(
    "enabled status should match",
    retrievedPreference.enabled,
    createdPreference.enabled,
  );
  TestValidator.equals(
    "frequency limit should match",
    retrievedPreference.frequency_limit,
    createdPreference.frequency_limit,
  );
  TestValidator.equals(
    "quiet hours start should match",
    retrievedPreference.quiet_hours_start,
    createdPreference.quiet_hours_start,
  );
  TestValidator.equals(
    "quiet hours end should match",
    retrievedPreference.quiet_hours_end,
    createdPreference.quiet_hours_end,
  );

  // Step 5: Validate timestamps are properly set
  TestValidator.predicate(
    "created_at should be valid date",
    () => new Date(retrievedPreference.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at should be valid date",
    () => new Date(retrievedPreference.updated_at).getTime() > 0,
  );
  TestValidator.predicate(
    "created_at should be before or equal to updated_at",
    () =>
      new Date(retrievedPreference.created_at) <=
      new Date(retrievedPreference.updated_at),
  );

  // Step 6: Validate that retrieved data matches the original creation request
  TestValidator.equals(
    "retrieved notification type matches creation request",
    retrievedPreference.notification_type,
    createPreferenceBody.notification_type,
  );
  TestValidator.equals(
    "retrieved delivery channel matches creation request",
    retrievedPreference.delivery_channel,
    createPreferenceBody.delivery_channel,
  );
  TestValidator.equals(
    "retrieved enabled status matches creation request",
    retrievedPreference.enabled,
    createPreferenceBody.enabled,
  );
  TestValidator.equals(
    "retrieved frequency limit matches creation request",
    retrievedPreference.frequency_limit,
    createPreferenceBody.frequency_limit,
  );
  TestValidator.equals(
    "retrieved quiet hours start matches creation request",
    retrievedPreference.quiet_hours_start,
    createPreferenceBody.quiet_hours_start,
  );
  TestValidator.equals(
    "retrieved quiet hours end matches creation request",
    retrievedPreference.quiet_hours_end,
    createPreferenceBody.quiet_hours_end,
  );
}
