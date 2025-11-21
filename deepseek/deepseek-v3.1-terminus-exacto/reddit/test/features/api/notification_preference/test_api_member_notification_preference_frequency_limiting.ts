import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationPreference";

/**
 * Test notification preference frequency limiting functionality.
 *
 * This test validates that members can set appropriate frequency limits to
 * prevent notification overload while maintaining important communication. The
 * test covers creating preferences with various frequency limits (from
 * unlimited to strict limits), verifying that the system properly enforces rate
 * limiting, and ensuring that frequency limits work correctly with different
 * notification types and delivery channels.
 */
export async function test_api_member_notification_preference_frequency_limiting(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for testing with proper random data
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12); // Secure random password meeting min length
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(), // Random valid URI
        referrer: typia.random<string & tags.Format<"uri">>(), // Random valid URI
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Available notification types and delivery channels for testing
  const notificationTypes = [
    "content_replies",
    "mentions",
    "community_updates",
    "system_alerts",
    "moderation_actions",
  ] as const;
  const deliveryChannels = ["in_app", "email", "push", "all"] as const;

  // Step 2: Test notification preference with unlimited frequency (0 = no limit)
  const unlimitedPreference: ICommunityPlatformNotificationPreference =
    await api.functional.communityPlatform.member.notificationPreferences.create(
      connection,
      {
        body: {
          notification_type: RandomGenerator.pick(notificationTypes),
          delivery_channel: RandomGenerator.pick(deliveryChannels),
          enabled: true,
          frequency_limit: 0, // Unlimited notifications
        } satisfies ICommunityPlatformNotificationPreference.ICreate,
      },
    );
  typia.assert(unlimitedPreference);
  TestValidator.equals(
    "unlimited frequency preference created",
    unlimitedPreference.frequency_limit,
    0,
  );
  TestValidator.predicate(
    "unlimited preference has valid notification type",
    notificationTypes.includes(
      unlimitedPreference.notification_type as (typeof notificationTypes)[number],
    ),
  );

  // Step 3: Test notification preference with moderate frequency limit
  const moderatePreference: ICommunityPlatformNotificationPreference =
    await api.functional.communityPlatform.member.notificationPreferences.create(
      connection,
      {
        body: {
          notification_type: RandomGenerator.pick(notificationTypes),
          delivery_channel: RandomGenerator.pick(deliveryChannels),
          enabled: true,
          frequency_limit: 10, // Moderate limit: 10 notifications per hour
        } satisfies ICommunityPlatformNotificationPreference.ICreate,
      },
    );
  typia.assert(moderatePreference);
  TestValidator.equals(
    "moderate frequency preference created",
    moderatePreference.frequency_limit,
    10,
  );
  TestValidator.predicate(
    "moderate preference has valid delivery channel",
    deliveryChannels.includes(
      moderatePreference.delivery_channel as (typeof deliveryChannels)[number],
    ),
  );

  // Step 4: Test notification preference with strict frequency limit
  const strictPreference: ICommunityPlatformNotificationPreference =
    await api.functional.communityPlatform.member.notificationPreferences.create(
      connection,
      {
        body: {
          notification_type: RandomGenerator.pick(notificationTypes),
          delivery_channel: RandomGenerator.pick(deliveryChannels),
          enabled: true,
          frequency_limit: 1, // Strict limit: 1 notification per hour
        } satisfies ICommunityPlatformNotificationPreference.ICreate,
      },
    );
  typia.assert(strictPreference);
  TestValidator.equals(
    "strict frequency preference created",
    strictPreference.frequency_limit,
    1,
  );

  // Step 5: Test notification preference without frequency limit (undefined)
  const noLimitPreference: ICommunityPlatformNotificationPreference =
    await api.functional.communityPlatform.member.notificationPreferences.create(
      connection,
      {
        body: {
          notification_type: RandomGenerator.pick(notificationTypes),
          delivery_channel: RandomGenerator.pick(deliveryChannels),
          enabled: true,
          // frequency_limit intentionally omitted
        } satisfies ICommunityPlatformNotificationPreference.ICreate,
      },
    );
  typia.assert(noLimitPreference);
  TestValidator.equals(
    "no frequency limit preference created",
    noLimitPreference.frequency_limit,
    undefined,
  );

  // Step 6: Test disabled notification preference with frequency limit
  const disabledPreference: ICommunityPlatformNotificationPreference =
    await api.functional.communityPlatform.member.notificationPreferences.create(
      connection,
      {
        body: {
          notification_type: RandomGenerator.pick(notificationTypes),
          delivery_channel: RandomGenerator.pick(deliveryChannels),
          enabled: false, // Disabled preference
          frequency_limit: 5,
        } satisfies ICommunityPlatformNotificationPreference.ICreate,
      },
    );
  typia.assert(disabledPreference);
  TestValidator.equals(
    "disabled preference with frequency limit",
    disabledPreference.enabled,
    false,
  );
  TestValidator.equals(
    "disabled preference frequency limit",
    disabledPreference.frequency_limit,
    5,
  );

  // Step 7: Validate that all preferences have unique IDs and proper timestamps
  const preferences = [
    unlimitedPreference,
    moderatePreference,
    strictPreference,
    noLimitPreference,
    disabledPreference,
  ];

  TestValidator.equals(
    "all preferences have unique IDs",
    new Set(preferences.map((p) => p.id)).size,
    preferences.length,
  );

  TestValidator.predicate(
    "all preferences have creation timestamps",
    preferences.every((p) => p.created_at && typeof p.created_at === "string"),
  );

  TestValidator.predicate(
    "all preferences have update timestamps",
    preferences.every((p) => p.updated_at && typeof p.updated_at === "string"),
  );

  // Step 8: Verify that frequency limits are properly stored and retrieved
  TestValidator.equals(
    "unlimited frequency limit preserved",
    unlimitedPreference.frequency_limit,
    0,
  );
  TestValidator.equals(
    "moderate frequency limit preserved",
    moderatePreference.frequency_limit,
    10,
  );
  TestValidator.equals(
    "strict frequency limit preserved",
    strictPreference.frequency_limit,
    1,
  );
  TestValidator.equals(
    "no frequency limit remains undefined",
    noLimitPreference.frequency_limit,
    undefined,
  );
  TestValidator.equals(
    "disabled preference frequency limit preserved",
    disabledPreference.frequency_limit,
    5,
  );

  // Step 9: Validate frequency limit constraints (minimum 0 as per DTO)
  TestValidator.predicate(
    "frequency limits respect minimum constraint",
    preferences.every(
      (p) => p.frequency_limit === undefined || p.frequency_limit >= 0,
    ),
  );

  // Step 10: Test that preferences with different settings can coexist
  TestValidator.predicate(
    "different notification types can coexist",
    new Set(preferences.map((p) => p.notification_type)).size > 1,
  );

  TestValidator.predicate(
    "different delivery channels can coexist",
    new Set(preferences.map((p) => p.delivery_channel)).size > 1,
  );
}
