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
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_notification_preferences_update_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: `https://example.com/join?source=${RandomGenerator.alphaNumeric(6)}`,
      referrer: `https://example.com/home?ref=${RandomGenerator.alphaNumeric(6)}`,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  // Step 2: Update notification preferences with specific categories
  const updatedPreferences =
    await api.functional.communityPlatform.member.notification_preferences.patch(
      memberConnection,
      {
        body: {
          new_post_in_followed_communities: true,
          reply_to_your_comments: false,
          direct_messages: true,
          system_announcements: true,
        } satisfies ICommunityPlatformUserNotificationPreference.IRequest,
      },
    );
  typia.assert(updatedPreferences);
  // Step 3: Validate notification_types includes default values
  TestValidator.predicate(
    "notification_types contains required default types",
    () =>
      updatedPreferences.notification_types.includes("new_post") &&
      updatedPreferences.notification_types.includes("comment_reply") &&
      updatedPreferences.notification_types.includes("direct_message"),
  );
  // Step 4: Validate that unspecified preferences remain unchanged (use default values)
  TestValidator.equals(
    "email_enabled remains default",
    updatedPreferences.email_enabled,
    true,
  );
  TestValidator.equals(
    "push_enabled remains default",
    updatedPreferences.push_enabled,
    true,
  );
  TestValidator.equals(
    "sms_enabled remains default",
    updatedPreferences.sms_enabled,
    true,
  );
  TestValidator.equals(
    "preferred_timezone remains default",
    updatedPreferences.preferred_timezone,
    "Asia/Seoul",
  );
  TestValidator.equals(
    "delivery_time_start remains default",
    updatedPreferences.delivery_time_start,
    "08:00:00",
  );
  TestValidator.equals(
    "delivery_time_end remains default",
    updatedPreferences.delivery_time_end,
    "22:00:00",
  );
}