import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationPreference";

/**
 * Validates notification preference creation workflow for authenticated
 * members.
 *
 * This test ensures that members can establish personalized notification
 * settings after successful account creation and authentication. The workflow
 * validates that notification preferences can be customized with granular
 * control over notification types, delivery channels, frequency limits, and
 * quiet hours.
 */
export async function test_api_notification_preference_creation_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: RandomGenerator.alphabets(10),
      display_name: RandomGenerator.name(2),
      href: "https://community-platform.example.com/register",
      referrer: "https://community-platform.example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create notification preference with comprehensive settings
  const notificationTypes = [
    "content_replies",
    "mentions",
    "community_updates",
    "moderation_actions",
    "system_alerts",
  ] as const;
  const deliveryChannels = ["in_app", "email", "push", "all"] as const;

  const preferenceData = {
    notification_type: RandomGenerator.pick(notificationTypes),
    delivery_channel: RandomGenerator.pick(deliveryChannels),
    enabled: Math.random() > 0.5,
    frequency_limit:
      Math.random() > 0.3
        ? typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>()
        : undefined,
    quiet_hours_start:
      Math.random() > 0.5
        ? ("22:00" satisfies string | undefined as string | undefined)
        : undefined,
    quiet_hours_end:
      Math.random() > 0.5
        ? ("08:00" satisfies string | undefined as string | undefined)
        : undefined,
  } satisfies ICommunityPlatformNotificationPreference.ICreate;

  const createdPreference =
    await api.functional.communityPlatform.member.notificationPreferences.create(
      connection,
      {
        body: preferenceData,
      },
    );
  typia.assert(createdPreference);

  // Step 3: Validate preference creation response
  TestValidator.equals(
    "notification type matches input",
    createdPreference.notification_type,
    preferenceData.notification_type,
  );
  TestValidator.equals(
    "delivery channel matches input",
    createdPreference.delivery_channel,
    preferenceData.delivery_channel,
  );
  TestValidator.equals(
    "enabled flag matches input",
    createdPreference.enabled,
    preferenceData.enabled,
  );

  if (preferenceData.frequency_limit !== undefined) {
    TestValidator.equals(
      "frequency limit matches input",
      createdPreference.frequency_limit,
      preferenceData.frequency_limit,
    );
  }

  if (preferenceData.quiet_hours_start !== undefined) {
    TestValidator.equals(
      "quiet hours start matches input",
      createdPreference.quiet_hours_start,
      preferenceData.quiet_hours_start,
    );
  }

  if (preferenceData.quiet_hours_end !== undefined) {
    TestValidator.equals(
      "quiet hours end matches input",
      createdPreference.quiet_hours_end,
      preferenceData.quiet_hours_end,
    );
  }
}
