import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserNotificationPreference";
import { prepare_random_community_platform_user_notification_preference } from "../../../prepare/prepare_random_community_platform_user_notification_preference";
import { generate_random_community_platform_member_notification_preferences_create } from "../../../generate/generate_random_community_platform_member_notification_preferences_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_notification_preferences_update_system_default(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);
  // Step 2: Use authenticated connection to update notification preferences
  // Configure preferences with system-default state and critical notification type
  const updatedPreferences: ICommunityPlatformUserNotificationPreference =
    await generate_random_community_platform_member_notification_preferences_create(
      memberConnection,
      {
        body: {
          email: false, // Channel preferences should be ignored with system-default state
          push: false, // Channel preferences should be ignored with system-default state
          in_app: false, // Channel preferences should be ignored with system-default state
          sms: false, // Channel preferences should be ignored with system-default state
          notification_type: "critical", // Critical notification type
          preference_state: "system-default", // Delegates to platform defaults
        } satisfies ICommunityPlatformUserNotificationPreference.ICreate,
      },
    );
  typia.assert(updatedPreferences);
  // Step 3: Validate that preferences were updated with system-default state and critical type
  // The response doesn't return preference_state or notification_type - it returns notification_types
  // When preference_state is 'system-default' and notification_type is 'critical',
  // the system should only include 'system_announcement' in notification_types
  TestValidator.equals(
    "notification types should include only system_announcement for critical system-default",
    updatedPreferences.notification_types,
    ["system_announcement"],
  );
}
