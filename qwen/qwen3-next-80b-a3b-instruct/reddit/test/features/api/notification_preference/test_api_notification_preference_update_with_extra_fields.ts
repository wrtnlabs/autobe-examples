import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationPreference";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

/**
 * Test update of notification preference with extra fields.
 *
 * Authenticate as member and create a notification preference. Then use PUT
 * /notification-preferences/{preferenceId} with a request body containing only
 * the allowed field "active: false". Verify that the system ignores any extra
 * fields provided in the JSON body (even if included via unintended end-user
 * input) and only updates the active field. This validates that the system
 * strictly enforces the ICommunityPlatformNotificationPreference.IUpdate schema
 * and prevents privilege escalation via malicious payloads.
 *
 * 1. Authenticate member with join operation
 * 2. Create a notification preference
 * 3. Update preference with only active field (all other fields systemic and
 *    ignored by API)
 * 4. Verify that only active field changed and all other fields remain unchanged
 * 5. Verify that the system does not allow modification of system-managed fields
 *    (user_id, type, id, created_at)
 */
export async function test_api_notification_preference_update_with_extra_fields(
  connection: api.IConnection,
) {
  // 1. Authenticate member
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "aStrongPassword123!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // 2. Create notification preference
  const notificationType: ICommunityPlatformNotificationPreference.ICreate["type"] =
    RandomGenerator.pick([
      "comment_mention",
      "moderation_action",
      "report_update",
      "system_announcement",
      "community_invite",
      "new_follower",
    ] as const);
  const createdPreference: ICommunityPlatformNotificationPreference =
    await api.functional.communityPlatform.member.notification_preferences.create(
      connection,
      {
        body: {
          type: notificationType,
        } satisfies ICommunityPlatformNotificationPreference.ICreate,
      },
    );
  typia.assert(createdPreference);
  TestValidator.equals(
    "preference created with active: true",
    createdPreference.active,
    true,
  );

  // 3. Update preference with valid IUpdate body (only active field allowed)
  // This simulates normal stable update. The API must ignore any other fields that might be present in the JSON (e.g. user_id, type)
  // because the request body schema only allows "active". Even if malicious client sends extra fields, they should be ignored.
  const updatedPreference: ICommunityPlatformNotificationPreference =
    await api.functional.communityPlatform.member.notification_preferences.putByPreferenceid(
      connection,
      {
        preferenceId: createdPreference.id,
        body: {
          active: false, // Only allowed field in IUpdate schema - extra fields would be ignored if sent
        } satisfies ICommunityPlatformNotificationPreference.IUpdate,
      },
    );
  typia.assert(updatedPreference);

  // 4. Verify: Only active field was updated, all system fields preserved
  TestValidator.equals(
    "active field was updated to false",
    updatedPreference.active,
    false,
  );
  TestValidator.equals(
    "user_id was preserved",
    updatedPreference.user_id,
    createdPreference.user_id,
  );
  TestValidator.equals(
    "type was preserved",
    updatedPreference.type,
    notificationType,
  );
  TestValidator.equals(
    "id was preserved",
    updatedPreference.id,
    createdPreference.id,
  );
  TestValidator.equals(
    "created_at was preserved",
    updatedPreference.created_at,
    createdPreference.created_at,
  );
  TestValidator.predicate(
    "updated_at was updated",
    updatedPreference.updated_at !== createdPreference.updated_at,
  );
}
