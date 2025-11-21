import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationPreference";

/**
 * Test notification preference quiet hours configuration.
 *
 * This test validates that members can establish quiet hours periods when
 * notifications are suppressed to respect personal time. The test covers
 * creating preferences with various quiet hours configurations, including
 * overnight periods, work hours, and custom time windows. The scenario ensures
 * that quiet hours settings are properly validated and integrated with the
 * platform's notification delivery scheduling system.
 */
export async function test_api_member_notification_preference_quiet_hours(
  connection: api.IConnection,
) {
  // 1. Create member account for authentication context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 2. Test creating notification preference with overnight quiet hours (22:00-06:00)
  const overnightPreference =
    await api.functional.communityPlatform.member.notificationPreferences.create(
      connection,
      {
        body: {
          notification_type: "content_replies",
          delivery_channel: "all",
          enabled: true,
          quiet_hours_start: "22:00",
          quiet_hours_end: "06:00",
        } satisfies ICommunityPlatformNotificationPreference.ICreate,
      },
    );
  typia.assert(overnightPreference);
  TestValidator.equals(
    "overnight quiet hours start",
    overnightPreference.quiet_hours_start,
    "22:00",
  );
  TestValidator.equals(
    "overnight quiet hours end",
    overnightPreference.quiet_hours_end,
    "06:00",
  );

  // 3. Test creating notification preference with work hours quiet hours (09:00-17:00)
  const workHoursPreference =
    await api.functional.communityPlatform.member.notificationPreferences.create(
      connection,
      {
        body: {
          notification_type: "mentions",
          delivery_channel: "email",
          enabled: true,
          quiet_hours_start: "09:00",
          quiet_hours_end: "17:00",
        } satisfies ICommunityPlatformNotificationPreference.ICreate,
      },
    );
  typia.assert(workHoursPreference);
  TestValidator.equals(
    "work hours quiet hours start",
    workHoursPreference.quiet_hours_start,
    "09:00",
  );
  TestValidator.equals(
    "work hours quiet hours end",
    workHoursPreference.quiet_hours_end,
    "17:00",
  );

  // 4. Test creating notification preference without quiet hours (normal delivery)
  const normalPreference =
    await api.functional.communityPlatform.member.notificationPreferences.create(
      connection,
      {
        body: {
          notification_type: "system_alerts",
          delivery_channel: "in_app",
          enabled: true,
        } satisfies ICommunityPlatformNotificationPreference.ICreate,
      },
    );
  typia.assert(normalPreference);
  TestValidator.equals(
    "normal preference quiet hours start",
    normalPreference.quiet_hours_start,
    undefined,
  );
  TestValidator.equals(
    "normal preference quiet hours end",
    normalPreference.quiet_hours_end,
    undefined,
  );

  // 5. Test creating notification preference with frequency limit
  const limitedPreference =
    await api.functional.communityPlatform.member.notificationPreferences.create(
      connection,
      {
        body: {
          notification_type: "community_updates",
          delivery_channel: "push",
          enabled: true,
          frequency_limit: 10,
          quiet_hours_start: "20:00",
          quiet_hours_end: "08:00",
        } satisfies ICommunityPlatformNotificationPreference.ICreate,
      },
    );
  typia.assert(limitedPreference);
  TestValidator.equals(
    "limited preference frequency limit",
    limitedPreference.frequency_limit,
    10,
  );
  TestValidator.equals(
    "limited preference quiet hours start",
    limitedPreference.quiet_hours_start,
    "20:00",
  );
  TestValidator.equals(
    "limited preference quiet hours end",
    limitedPreference.quiet_hours_end,
    "08:00",
  );

  // 6. Test disabled notification preference
  const disabledPreference =
    await api.functional.communityPlatform.member.notificationPreferences.create(
      connection,
      {
        body: {
          notification_type: "moderation_actions",
          delivery_channel: "all",
          enabled: false,
          quiet_hours_start: "23:00",
          quiet_hours_end: "07:00",
        } satisfies ICommunityPlatformNotificationPreference.ICreate,
      },
    );
  typia.assert(disabledPreference);
  TestValidator.equals(
    "disabled preference enabled flag",
    disabledPreference.enabled,
    false,
  );
  TestValidator.equals(
    "disabled preference quiet hours start",
    disabledPreference.quiet_hours_start,
    "23:00",
  );
  TestValidator.equals(
    "disabled preference quiet hours end",
    disabledPreference.quiet_hours_end,
    "07:00",
  );
}
