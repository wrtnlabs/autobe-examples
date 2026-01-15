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
export async function test_api_notification_preferences_default_reset(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an authenticated member connection using join
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData: ICommunityPlatformMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, { body: memberData });
  typia.assert(member);
  // Step 2: Reset all notification preferences to false (disabling all)
  const notificationPreferenceReset: ICommunityPlatformUserNotificationPreference.IRequest =
    {
      new_post_in_followed_communities: false,
      reply_to_your_comments: false,
      direct_messages: false,
      system_announcements: false,
      new_replies_in_discussion_threads_you_participate: false,
      community_moderation_actions: false,
      content_your_likes: false,
      content_your_upvotes: false,
      content_your_downvotes: false,
    };
  const updatedPreferences: ICommunityPlatformUserNotificationPreference =
    await api.functional.communityPlatform.member.notification_preferences.patch(
      memberConnection,
      {
        body: notificationPreferenceReset,
      },
    );
  typia.assert(updatedPreferences);
  // Step 3: Validate that all preferences are set to false as expected
  TestValidator.equals(
    "email_enabled reset to false",
    updatedPreferences.email_enabled,
    false,
  );
  TestValidator.equals(
    "push_enabled reset to false",
    updatedPreferences.push_enabled,
    false,
  );
  TestValidator.equals(
    "sms_enabled reset to false",
    updatedPreferences.sms_enabled,
    false,
  );
  TestValidator.equals(
    "notification_types reset to empty array",
    updatedPreferences.notification_types,
    [],
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
  TestValidator.equals(
    "preferred_timezone remains default",
    updatedPreferences.preferred_timezone,
    "Asia/Seoul",
  );
}
