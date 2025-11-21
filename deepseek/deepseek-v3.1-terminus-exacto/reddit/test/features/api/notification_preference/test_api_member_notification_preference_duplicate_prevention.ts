import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationPreference";

/**
 * Validates the duplicate prevention mechanism for notification preferences.
 *
 * This test ensures that the system properly prevents creation of duplicate
 * notification preferences for the same user, notification type, and delivery
 * channel combination while allowing creation of preferences with different
 * notification types or delivery channels.
 */
export async function test_api_member_notification_preference_duplicate_prevention(
  connection: api.IConnection,
) {
  // Step 1: Create member account for testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePassword1234";

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create initial notification preference
  const initialPreference: ICommunityPlatformNotificationPreference =
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

  // Step 3: Attempt to create duplicate preference (should fail)
  await TestValidator.error(
    "duplicate notification preference should fail",
    async () => {
      await api.functional.communityPlatform.member.notificationPreferences.create(
        connection,
        {
          body: {
            notification_type: "content_replies",
            delivery_channel: "in_app",
            enabled: false,
            frequency_limit: 5,
          } satisfies ICommunityPlatformNotificationPreference.ICreate,
        },
      );
    },
  );

  // Step 4: Verify non-duplicate preferences can still be created
  const differentTypePreference: ICommunityPlatformNotificationPreference =
    await api.functional.communityPlatform.member.notificationPreferences.create(
      connection,
      {
        body: {
          notification_type: "mentions",
          delivery_channel: "in_app",
          enabled: true,
        } satisfies ICommunityPlatformNotificationPreference.ICreate,
      },
    );
  typia.assert(differentTypePreference);

  const differentChannelPreference: ICommunityPlatformNotificationPreference =
    await api.functional.communityPlatform.member.notificationPreferences.create(
      connection,
      {
        body: {
          notification_type: "content_replies",
          delivery_channel: "email",
          enabled: true,
        } satisfies ICommunityPlatformNotificationPreference.ICreate,
      },
    );
  typia.assert(differentChannelPreference);

  // Step 5: Validate that all created preferences are distinct
  TestValidator.notEquals(
    "different notification types should create different preference IDs",
    initialPreference.id,
    differentTypePreference.id,
  );

  TestValidator.notEquals(
    "different delivery channels should create different preference IDs",
    initialPreference.id,
    differentChannelPreference.id,
  );
}
