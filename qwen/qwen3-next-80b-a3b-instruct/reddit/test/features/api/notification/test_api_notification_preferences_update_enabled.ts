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
export async function test_api_notification_preferences_update_enabled(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member connection and authenticate via join
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
  // Step 2: Create notification preferences with all channels enabled and preference_state = enabled
  const pref: ICommunityPlatformUserNotificationPreference =
    await generate_random_community_platform_member_notification_preferences_create(
      memberConnection,
      {
        body: {
          email: true,
          push: true,
          in_app: true,
          sms: true,
          notification_type: "all",
          preference_state: "enabled",
        } satisfies ICommunityPlatformUserNotificationPreference.ICreate,
      },
    );
  typia.assert(pref);
  // Step 3: Validate all channel settings are enabled
  // Check each individual channel setting as defined in the DTO
  TestValidator.equals("email_enabled is true", pref.email_enabled, true);
  TestValidator.equals("push_enabled is true", pref.push_enabled, true);
  TestValidator.equals("sms_enabled is true", pref.sms_enabled, true);
  // NOTE: Removed validation of 'in_app' property as it does not exist in the response type ICommunityPlatformUserNotificationPreference
  // Validate notification_types array contains all possible types when notification_type is "all"
  const allNotificationTypes: (
    | "new_post"
    | "comment_reply"
    | "direct_message"
    | "system_announcement"
    | "community_invite"
    | "membership_status"
    | "product_alert"
    | "sale_alert"
    | "inventory_alert"
    | "shipment_status"
  )[] = [
    "new_post",
    "comment_reply",
    "direct_message",
    "system_announcement",
    "community_invite",
    "membership_status",
    "product_alert",
    "sale_alert",
    "inventory_alert",
    "shipment_status",
  ];
  // Validate that notification_types has exactly 10 types
  TestValidator.equals(
    "notification_types has correct count",
    pref.notification_types.length,
    allNotificationTypes.length,
  );
  // Validate that each expected type is present in the notification_types array
  allNotificationTypes.forEach((type) => {
    TestValidator.predicate(`notification_types includes ${type}`, () =>
      pref.notification_types.includes(type),
    );
  });
  // Validate time format with typia.assert (not hardcoded values)
  TestValidator.predicate("delivery_time_start has correct time format", () =>
    /^[0-2][0-9]:[0-5][0-9]:[0-5][0-9]$/.test(pref.delivery_time_start),
  );
  TestValidator.predicate("delivery_time_end has correct time format", () =>
    /^[0-2][0-9]:[0-5][0-9]:[0-5][0-9]$/.test(pref.delivery_time_end),
  );
  TestValidator.predicate("preferred_timezone has correct IANA format", () =>
    /^[A-Za-z]+\/([A-Za-z_]+)$/.test(pref.preferred_timezone),
  );
}
