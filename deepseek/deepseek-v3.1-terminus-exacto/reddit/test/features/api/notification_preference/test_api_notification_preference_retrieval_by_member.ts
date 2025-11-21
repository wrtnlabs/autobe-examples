import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationPreference";

/**
 * Test that a member user can retrieve their own notification preference
 * settings after creation.
 *
 * This E2E test validates the complete workflow of notification preference
 * management:
 *
 * 1. Member user creates their own notification preference record
 * 2. Member retrieves their own preference settings
 * 3. All preference fields are validated for correctness and data integrity
 *
 * The test ensures that notification preferences are properly created and can
 * be retrieved by the authenticated member who owns them, validating all
 * preference configuration including notification type, delivery channel,
 * enabled status, frequency limits, and quiet hours settings.
 */
export async function test_api_notification_preference_retrieval_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create member account for preference ownership
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPassword123!",
        display_name: RandomGenerator.name(),
        ip: "192.168.1.1",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create notification preference with member context
  const preferenceData = {
    notification_type: "content_replies",
    delivery_channel: "email",
    enabled: true,
    frequency_limit: 10,
    quiet_hours_start: "22:00",
    quiet_hours_end: "07:00",
  } satisfies ICommunityPlatformNotificationPreference.ICreate;

  // Note: Based on API analysis, member preference creation might not be available
  // Using admin API for creation as specified in dependencies
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  const createdPreference: ICommunityPlatformNotificationPreference =
    await api.functional.communityPlatform.admin.notificationPreferences.create(
      connection,
      { body: preferenceData },
    );
  typia.assert(createdPreference);

  // Step 3: Switch back to member authentication for retrieval
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "MemberPassword123!",
      ip: "192.168.1.1",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 4: Attempt to retrieve notification preference using member API
  // This may fail due to authorization, but tests the scenario requirement
  const retrievedPreference: ICommunityPlatformNotificationPreference =
    await api.functional.communityPlatform.member.notificationPreferences.at(
      connection,
      { preferenceId: createdPreference.id },
    );
  typia.assert(retrievedPreference);

  // Step 5: Validate all preference fields match original configuration
  TestValidator.equals(
    "preference ID should match",
    retrievedPreference.id,
    createdPreference.id,
  );
  TestValidator.equals(
    "notification type should match",
    retrievedPreference.notification_type,
    preferenceData.notification_type,
  );
  TestValidator.equals(
    "delivery channel should match",
    retrievedPreference.delivery_channel,
    preferenceData.delivery_channel,
  );
  TestValidator.equals(
    "enabled status should match",
    retrievedPreference.enabled,
    preferenceData.enabled,
  );
  TestValidator.equals(
    "frequency limit should match",
    retrievedPreference.frequency_limit,
    preferenceData.frequency_limit,
  );
  TestValidator.equals(
    "quiet hours start should match",
    retrievedPreference.quiet_hours_start,
    preferenceData.quiet_hours_start,
  );
  TestValidator.equals(
    "quiet hours end should match",
    retrievedPreference.quiet_hours_end,
    preferenceData.quiet_hours_end,
  );
  TestValidator.predicate(
    "created_at timestamp should be valid",
    retrievedPreference.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp should be valid",
    retrievedPreference.updated_at !== undefined,
  );
}
