import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationPreference";

/**
 * Test that members can update their existing notification preferences with new
 * settings. Validates that preference updates work correctly for various
 * notification types and delivery channels. The test ensures that frequency
 * limits, quiet hours, and enabled status can be modified while maintaining
 * data integrity and proper authorization checks.
 */
export async function test_api_member_notification_preference_update(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create an initial notification preference
  const initialPreference =
    await api.functional.communityPlatform.member.notificationPreferences.create(
      connection,
      {
        body: {
          notification_type: "content_replies",
          delivery_channel: "in_app",
          enabled: true,
          frequency_limit: 10,
          quiet_hours_start: "22:00",
          quiet_hours_end: "06:00",
        } satisfies ICommunityPlatformNotificationPreference.ICreate,
      },
    );
  typia.assert(initialPreference);

  // Step 3: Update the notification preference with new settings
  const updatedPreference =
    await api.functional.communityPlatform.member.notificationPreferences.update(
      connection,
      {
        preferenceId: initialPreference.id,
        body: {
          delivery_channel: "email",
          enabled: false,
          frequency_limit: 5,
          quiet_hours_start: "23:00",
          quiet_hours_end: "07:00",
        } satisfies ICommunityPlatformNotificationPreference.IUpdate,
      },
    );
  typia.assert(updatedPreference);

  // Step 4: Validate the update was successful
  TestValidator.equals(
    "preference ID should remain the same",
    updatedPreference.id,
    initialPreference.id,
  );
  TestValidator.equals(
    "notification type should remain unchanged",
    updatedPreference.notification_type,
    initialPreference.notification_type,
  );
  TestValidator.equals(
    "delivery channel should be updated",
    updatedPreference.delivery_channel,
    "email",
  );
  TestValidator.equals(
    "enabled status should be updated",
    updatedPreference.enabled,
    false,
  );
  TestValidator.equals(
    "frequency limit should be updated",
    updatedPreference.frequency_limit,
    5,
  );
  TestValidator.equals(
    "quiet hours start should be updated",
    updatedPreference.quiet_hours_start,
    "23:00",
  );
  TestValidator.equals(
    "quiet hours end should be updated",
    updatedPreference.quiet_hours_end,
    "07:00",
  );
  TestValidator.notEquals(
    "updated_at timestamp should change",
    updatedPreference.updated_at,
    initialPreference.updated_at,
  );
  TestValidator.equals(
    "created_at timestamp should remain unchanged",
    updatedPreference.created_at,
    initialPreference.created_at,
  );

  // Step 5: Test partial updates
  const partialUpdate =
    await api.functional.communityPlatform.member.notificationPreferences.update(
      connection,
      {
        preferenceId: initialPreference.id,
        body: {
          enabled: true,
        } satisfies ICommunityPlatformNotificationPreference.IUpdate,
      },
    );
  typia.assert(partialUpdate);

  // Validate partial update preserves other fields
  TestValidator.equals(
    "delivery channel should remain after partial update",
    partialUpdate.delivery_channel,
    "email",
  );
  TestValidator.equals(
    "frequency limit should remain after partial update",
    partialUpdate.frequency_limit,
    5,
  );
  TestValidator.equals(
    "quiet hours should remain after partial update",
    partialUpdate.quiet_hours_start,
    "23:00",
  );
  TestValidator.equals(
    "quiet hours end should remain after partial update",
    partialUpdate.quiet_hours_end,
    "07:00",
  );
  TestValidator.equals(
    "enabled status should be updated in partial update",
    partialUpdate.enabled,
    true,
  );

  // Step 6: Test error scenarios
  // Test with invalid preference ID
  await TestValidator.error(
    "should fail with invalid preference ID",
    async () => {
      await api.functional.communityPlatform.member.notificationPreferences.update(
        connection,
        {
          preferenceId: "invalid-uuid-format",
          body: {
            enabled: false,
          } satisfies ICommunityPlatformNotificationPreference.IUpdate,
        },
      );
    },
  );

  // Test with non-existent preference ID
  await TestValidator.error(
    "should fail with non-existent preference ID",
    async () => {
      await api.functional.communityPlatform.member.notificationPreferences.update(
        connection,
        {
          preferenceId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            enabled: false,
          } satisfies ICommunityPlatformNotificationPreference.IUpdate,
        },
      );
    },
  );

  // Test different notification type updates
  const anotherPreference =
    await api.functional.communityPlatform.member.notificationPreferences.create(
      connection,
      {
        body: {
          notification_type: "mentions",
          delivery_channel: "push",
          enabled: true,
        } satisfies ICommunityPlatformNotificationPreference.ICreate,
      },
    );
  typia.assert(anotherPreference);

  const updatedMentionPreference =
    await api.functional.communityPlatform.member.notificationPreferences.update(
      connection,
      {
        preferenceId: anotherPreference.id,
        body: {
          delivery_channel: "all",
          frequency_limit: 20,
        } satisfies ICommunityPlatformNotificationPreference.IUpdate,
      },
    );
  typia.assert(updatedMentionPreference);

  TestValidator.equals(
    "mention preference delivery channel updated",
    updatedMentionPreference.delivery_channel,
    "all",
  );
  TestValidator.equals(
    "mention preference frequency limit updated",
    updatedMentionPreference.frequency_limit,
    20,
  );
  TestValidator.equals(
    "mention preference notification type unchanged",
    updatedMentionPreference.notification_type,
    "mentions",
  );
}
