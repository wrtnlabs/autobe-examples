import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformUserSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSettings";

export async function test_api_user_settings_update_partial_fields(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new member user
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    ip: null,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  const handle: string = authorized.username;

  // 2. Initial full settings update with all fields explicitly set
  const initialSettingsUpdate = {
    receive_comment_reply_notifications: true,
    receive_post_reply_notifications: true,
    receive_achievement_notifications: true,
    receive_moderation_notifications: false,
    receive_marketing_notifications: false,
    preferred_post_sort_mode: "hot",
    preferred_comment_sort_mode: "top",
    preferred_language: "en-US",
    timezone: "Asia/Seoul",
    show_activity_in_profile: true,
  } satisfies ICommunityPlatformUserSettings.IUpdate;

  const baselineSettings: ICommunityPlatformUserSettings =
    await api.functional.communityPlatform.memberUser.profiles.settings.update(
      connection,
      {
        handle,
        body: initialSettingsUpdate,
      },
    );
  typia.assert(baselineSettings);

  // 3. Second update: change only a subset of fields, omit others
  const partialUpdate = {
    receive_marketing_notifications: true, // flip from false -> true
    preferred_post_sort_mode: "new", // change from "hot" -> "new"
  } satisfies ICommunityPlatformUserSettings.IUpdate;

  const afterPartialUpdate: ICommunityPlatformUserSettings =
    await api.functional.communityPlatform.memberUser.profiles.settings.update(
      connection,
      {
        handle,
        body: partialUpdate,
      },
    );
  typia.assert(afterPartialUpdate);

  // 4. Retrieve settings via GET to confirm persisted state
  const currentSettings: ICommunityPlatformUserSettings =
    await api.functional.communityPlatform.memberUser.profiles.settings.at(
      connection,
      {
        handle,
      },
    );
  typia.assert(currentSettings);

  // 5. Validate changed fields reflect new values
  TestValidator.equals(
    "receive_marketing_notifications should be updated to true",
    currentSettings.receive_marketing_notifications,
    true,
  );
  TestValidator.equals(
    "preferred_post_sort_mode should be updated to 'new'",
    currentSettings.preferred_post_sort_mode,
    "new",
  );

  // 5b. Validate fields not included in partial update remain unchanged
  TestValidator.equals(
    "receive_comment_reply_notifications should remain unchanged",
    currentSettings.receive_comment_reply_notifications,
    baselineSettings.receive_comment_reply_notifications,
  );
  TestValidator.equals(
    "receive_post_reply_notifications should remain unchanged",
    currentSettings.receive_post_reply_notifications,
    baselineSettings.receive_post_reply_notifications,
  );
  TestValidator.equals(
    "receive_achievement_notifications should remain unchanged",
    currentSettings.receive_achievement_notifications,
    baselineSettings.receive_achievement_notifications,
  );
  TestValidator.equals(
    "receive_moderation_notifications should remain unchanged",
    currentSettings.receive_moderation_notifications,
    baselineSettings.receive_moderation_notifications,
  );
  TestValidator.equals(
    "preferred_comment_sort_mode should remain unchanged",
    currentSettings.preferred_comment_sort_mode,
    baselineSettings.preferred_comment_sort_mode,
  );
  TestValidator.equals(
    "preferred_language should remain unchanged",
    currentSettings.preferred_language,
    baselineSettings.preferred_language,
  );
  TestValidator.equals(
    "timezone should remain unchanged",
    currentSettings.timezone,
    baselineSettings.timezone,
  );
  TestValidator.equals(
    "show_activity_in_profile should remain unchanged",
    currentSettings.show_activity_in_profile,
    baselineSettings.show_activity_in_profile,
  );

  // 6. Verify timestamp behavior
  TestValidator.equals(
    "created_at should remain unchanged after partial update",
    currentSettings.created_at,
    baselineSettings.created_at,
  );

  await TestValidator.predicate("updated_at should move forward", async () => {
    const before = new Date(baselineSettings.updated_at).getTime();
    const after = new Date(currentSettings.updated_at).getTime();
    return after > before;
  });
}
