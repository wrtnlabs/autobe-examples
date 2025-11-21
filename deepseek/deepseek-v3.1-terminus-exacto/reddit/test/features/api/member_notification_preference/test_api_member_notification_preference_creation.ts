import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationPreference";

/**
 * Test member notification preference creation with comprehensive customization
 * options.
 *
 * This E2E test validates that members can create personalized notification
 * preferences with granular control over notification types, delivery channels,
 * frequency limits, and quiet hours. The test covers the complete workflow from
 * member registration to preference creation, ensuring proper authentication
 * context and business rule compliance.
 */
export async function test_api_member_notification_preference_creation(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: "https://example.com/registration",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Test creation of notification preference with different configurations
  const notificationTypes = [
    "content_replies",
    "mentions",
    "community_updates",
  ] as const;
  const deliveryChannels = ["in_app", "email", "push", "all"] as const;

  // Test multiple preference configurations
  for (const notificationType of notificationTypes) {
    for (const deliveryChannel of deliveryChannels) {
      // Create preference with realistic data
      const preferenceData = {
        notification_type: notificationType,
        delivery_channel: deliveryChannel,
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
          {
            body: preferenceData,
          },
        );
      typia.assert(createdPreference);
      // typia.assert() already validates ALL type aspects - no additional validation needed
    }
  }

  // Step 3: Test edge cases and business rule validations

  // Test with all optional fields populated
  const comprehensivePreference =
    await api.functional.communityPlatform.member.notificationPreferences.create(
      connection,
      {
        body: {
          notification_type: "system_alerts",
          delivery_channel: "all",
          enabled: true,
          frequency_limit: 10,
          quiet_hours_start: "23:00",
          quiet_hours_end: "06:00",
        } satisfies ICommunityPlatformNotificationPreference.ICreate,
      },
    );
  typia.assert(comprehensivePreference);

  // Test with minimal required fields only
  const minimalPreference =
    await api.functional.communityPlatform.member.notificationPreferences.create(
      connection,
      {
        body: {
          notification_type: "moderation_actions",
          delivery_channel: "in_app",
          enabled: false,
        } satisfies ICommunityPlatformNotificationPreference.ICreate,
      },
    );
  typia.assert(minimalPreference);
}
