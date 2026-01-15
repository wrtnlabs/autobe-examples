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
export async function test_api_notification_preferences_update_disabled(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  // Step 4: Update notification preferences with all channels disabled
  const updatedPreferences =
    await api.functional.communityPlatform.member.notification_preferences.create(
      memberConnection,
      {
        body: {
          email: false,
          push: false,
          in_app: false,
          sms: false,
          notification_type: "all",
          preference_state: "disabled", // Added required preference_state property
        } satisfies ICommunityPlatformUserNotificationPreference.ICreate,
      },
    );
  typia.assert(updatedPreferences);
  // Step 5: Validate that all channels are disabled
  TestValidator.equals(
    "email_enabled should be false",
    updatedPreferences.email_enabled,
    false,
  );
  TestValidator.equals(
    "push_enabled should be false",
    updatedPreferences.push_enabled,
    false,
  );
  TestValidator.equals(
    "sms_enabled should be false",
    updatedPreferences.sms_enabled,
    false,
  );
  // Step 6: Confirm notification_types array is not empty (maintains user's selected types despite being disabled)
  TestValidator.predicate(
    "notification_types should contain at least one type",
    updatedPreferences.notification_types.length > 0,
  );
  // Step 7: Validate delivery time window and timezone are preserved (not updated, only the disabled state changed)
  // NOTE: The system should preserve existing delivery_time_start, delivery_time_end, and preferred_timezone
  // Even though we didn't modify them in request, they should be retained from previous settings
  // Since this is the first time creating preferences, we should validate the default values
  // The system should have reasonable defaults for these fields
  // This is the most robust validation we can do given the context
  TestValidator.predicate(
    "delivery_time_start should be a valid time format",
    /^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/.test(
      updatedPreferences.delivery_time_start,
    ),
  );
  TestValidator.predicate(
    "delivery_time_end should be a valid time format",
    /^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/.test(
      updatedPreferences.delivery_time_end,
    ),
  );
  TestValidator.predicate(
    "preferred_timezone should be a valid timezone format",
    /^\w+\/\w+$/.test(updatedPreferences.preferred_timezone),
  );
}
