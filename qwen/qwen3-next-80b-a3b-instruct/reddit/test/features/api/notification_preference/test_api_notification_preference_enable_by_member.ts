import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationPreference";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_notification_preference_enable_by_member(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as member to establish context
  const email: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email,
        password: "SecurePass123!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a notification preference of type 'moderation_action' with initial active: false (simulated through system state)
  const notificationPreference: ICommunityPlatformNotificationPreference =
    await api.functional.communityPlatform.member.notification_preferences.create(
      connection,
      {
        body: {
          type: "moderation_action",
        } satisfies ICommunityPlatformNotificationPreference.ICreate,
      },
    );
  typia.assert(notificationPreference);

  // Step 3: Verify initial state is active: true (as per system default)
  TestValidator.equals(
    "initial preference active status is true",
    notificationPreference.active,
    true,
  );

  // Step 4: Disable the notification preference to simulate prior disable action (set active: false)
  const disablePreference: ICommunityPlatformNotificationPreference =
    await api.functional.communityPlatform.member.notification_preferences.putByPreferenceid(
      connection,
      {
        preferenceId: notificationPreference.id,
        body: {
          active: false,
        } satisfies ICommunityPlatformNotificationPreference.IUpdate,
      },
    );
  typia.assert(disablePreference);
  TestValidator.equals(
    "disabled preference active status is false",
    disablePreference.active,
    false,
  );

  // Step 5: Re-enable the notification preference (set active: true)
  const reenablePreference: ICommunityPlatformNotificationPreference =
    await api.functional.communityPlatform.member.notification_preferences.putByPreferenceid(
      connection,
      {
        preferenceId: notificationPreference.id,
        body: {
          active: true,
        } satisfies ICommunityPlatformNotificationPreference.IUpdate,
      },
    );
  typia.assert(reenablePreference);

  // Step 6: Verify successful re-enabling of the notification preference
  TestValidator.equals(
    "re-enabled preference active status is true",
    reenablePreference.active,
    true,
  );

  // Step 7: Validate that the member begins receiving notifications of this type
  // This is asserted by the successful PUT operation and the fact that active: true
  // corresponds to the member receiving notifications of type 'moderation_action'
  // The backend system handles the actual notification delivery, so we verify the preference state
  TestValidator.predicate(
    "preference is enabled for receiving notifications",
    reenablePreference.active === true,
  );
}
