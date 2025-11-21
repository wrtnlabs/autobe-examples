import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationPreference";

/**
 * Test creation of notification preferences with quiet hours configuration for
 * uninterrupted personal time. Validates that members can define specific time
 * windows when notifications should be suppressed, ensuring the system properly
 * handles quiet hour start and end times and respects user-defined
 * interruption-free periods.
 */
export async function test_api_notification_preference_creation_with_quiet_hours(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123",
      display_name: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create notification preference with quiet hours
  const notificationPreference =
    await api.functional.communityPlatform.member.notificationPreferences.create(
      connection,
      {
        body: {
          notification_type: "content_replies",
          delivery_channel: "all",
          enabled: true,
          frequency_limit: 10,
          quiet_hours_start: "22:00",
          quiet_hours_end: "06:00",
        } satisfies ICommunityPlatformNotificationPreference.ICreate,
      },
    );
  typia.assert(notificationPreference);

  // Step 3: Validate the created preference
  TestValidator.equals(
    "notification type matches",
    notificationPreference.notification_type,
    "content_replies",
  );
  TestValidator.equals(
    "delivery channel matches",
    notificationPreference.delivery_channel,
    "all",
  );
  TestValidator.equals(
    "enabled status matches",
    notificationPreference.enabled,
    true,
  );
  TestValidator.equals(
    "frequency limit matches",
    notificationPreference.frequency_limit,
    10,
  );
  TestValidator.equals(
    "quiet hours start matches",
    notificationPreference.quiet_hours_start,
    "22:00",
  );
  TestValidator.equals(
    "quiet hours end matches",
    notificationPreference.quiet_hours_end,
    "06:00",
  );
  TestValidator.predicate(
    "preference has valid UUID ID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      notificationPreference.id,
    ),
  );
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(new Date(notificationPreference.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(new Date(notificationPreference.updated_at).getTime()),
  );
}
