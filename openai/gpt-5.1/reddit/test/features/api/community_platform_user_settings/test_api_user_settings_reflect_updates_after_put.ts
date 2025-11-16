import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformUserSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSettings";

export async function test_api_user_settings_reflect_updates_after_put(
  connection: api.IConnection,
) {
  // 1. Register a new member user to obtain an authorized session and profile handle
  const joinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorized);

  const handle: string = authorized.username;

  // 2. Fetch baseline settings for this profile handle
  const baselineSettings: ICommunityPlatformUserSettings =
    await api.functional.communityPlatform.memberUser.profiles.settings.at(
      connection,
      {
        handle,
      },
    );
  typia.assert<ICommunityPlatformUserSettings>(baselineSettings);

  // 3. Build an explicit update payload for all configurable fields
  const updatedPayload = {
    receive_comment_reply_notifications: true,
    receive_post_reply_notifications: false,
    receive_achievement_notifications: true,
    receive_moderation_notifications: true,
    receive_marketing_notifications: false,
    preferred_post_sort_mode: "hot",
    preferred_comment_sort_mode: "new",
    preferred_language: "en-US",
    timezone: "Asia/Seoul",
    show_activity_in_profile: true,
  } satisfies ICommunityPlatformUserSettings.IUpdate;

  // 4. Apply the update via PUT and validate response fields
  const updatedSettings: ICommunityPlatformUserSettings =
    await api.functional.communityPlatform.memberUser.profiles.settings.update(
      connection,
      {
        handle,
        body: updatedPayload,
      },
    );
  typia.assert<ICommunityPlatformUserSettings>(updatedSettings);

  // Assert that all configurable fields match the payload we sent
  TestValidator.equals(
    "receive_comment_reply_notifications should match after PUT",
    updatedSettings.receive_comment_reply_notifications,
    updatedPayload.receive_comment_reply_notifications,
  );
  TestValidator.equals(
    "receive_post_reply_notifications should match after PUT",
    updatedSettings.receive_post_reply_notifications,
    updatedPayload.receive_post_reply_notifications,
  );
  TestValidator.equals(
    "receive_achievement_notifications should match after PUT",
    updatedSettings.receive_achievement_notifications,
    updatedPayload.receive_achievement_notifications,
  );
  TestValidator.equals(
    "receive_moderation_notifications should match after PUT",
    updatedSettings.receive_moderation_notifications,
    updatedPayload.receive_moderation_notifications,
  );
  TestValidator.equals(
    "receive_marketing_notifications should match after PUT",
    updatedSettings.receive_marketing_notifications,
    updatedPayload.receive_marketing_notifications,
  );
  TestValidator.equals(
    "preferred_post_sort_mode should match after PUT",
    updatedSettings.preferred_post_sort_mode,
    updatedPayload.preferred_post_sort_mode,
  );
  TestValidator.equals(
    "preferred_comment_sort_mode should match after PUT",
    updatedSettings.preferred_comment_sort_mode,
    updatedPayload.preferred_comment_sort_mode,
  );
  TestValidator.equals(
    "preferred_language should match after PUT",
    updatedSettings.preferred_language,
    updatedPayload.preferred_language,
  );
  TestValidator.equals(
    "timezone should match after PUT",
    updatedSettings.timezone,
    updatedPayload.timezone,
  );
  TestValidator.equals(
    "show_activity_in_profile should match after PUT",
    updatedSettings.show_activity_in_profile,
    updatedPayload.show_activity_in_profile,
  );

  // created_at must remain unchanged
  TestValidator.equals(
    "created_at should remain unchanged after settings update",
    updatedSettings.created_at,
    baselineSettings.created_at,
  );

  // updated_at should be equal or later than baseline updated_at
  const baselineUpdatedAtMs = Date.parse(baselineSettings.updated_at);
  const updatedUpdatedAtMs = Date.parse(updatedSettings.updated_at);

  TestValidator.predicate(
    "updated_at should be >= baseline updated_at after PUT",
    updatedUpdatedAtMs >= baselineUpdatedAtMs,
  );

  // 5. Fetch settings again via GET and verify they reflect the updated state
  const reloadedSettings: ICommunityPlatformUserSettings =
    await api.functional.communityPlatform.memberUser.profiles.settings.at(
      connection,
      {
        handle,
      },
    );
  typia.assert<ICommunityPlatformUserSettings>(reloadedSettings);

  // All configurable fields should equal those from updatedSettings (and payload)
  TestValidator.equals(
    "receive_comment_reply_notifications should persist after GET",
    reloadedSettings.receive_comment_reply_notifications,
    updatedSettings.receive_comment_reply_notifications,
  );
  TestValidator.equals(
    "receive_post_reply_notifications should persist after GET",
    reloadedSettings.receive_post_reply_notifications,
    updatedSettings.receive_post_reply_notifications,
  );
  TestValidator.equals(
    "receive_achievement_notifications should persist after GET",
    reloadedSettings.receive_achievement_notifications,
    updatedSettings.receive_achievement_notifications,
  );
  TestValidator.equals(
    "receive_moderation_notifications should persist after GET",
    reloadedSettings.receive_moderation_notifications,
    updatedSettings.receive_moderation_notifications,
  );
  TestValidator.equals(
    "receive_marketing_notifications should persist after GET",
    reloadedSettings.receive_marketing_notifications,
    updatedSettings.receive_marketing_notifications,
  );
  TestValidator.equals(
    "preferred_post_sort_mode should persist after GET",
    reloadedSettings.preferred_post_sort_mode,
    updatedSettings.preferred_post_sort_mode,
  );
  TestValidator.equals(
    "preferred_comment_sort_mode should persist after GET",
    reloadedSettings.preferred_comment_sort_mode,
    updatedSettings.preferred_comment_sort_mode,
  );
  TestValidator.equals(
    "preferred_language should persist after GET",
    reloadedSettings.preferred_language,
    updatedSettings.preferred_language,
  );
  TestValidator.equals(
    "timezone should persist after GET",
    reloadedSettings.timezone,
    updatedSettings.timezone,
  );
  TestValidator.equals(
    "show_activity_in_profile should persist after GET",
    reloadedSettings.show_activity_in_profile,
    updatedSettings.show_activity_in_profile,
  );

  // created_at should still be unchanged across all reads
  TestValidator.equals(
    "created_at should remain unchanged after subsequent GET",
    reloadedSettings.created_at,
    baselineSettings.created_at,
  );

  // updated_at from GET should be equal to that from PUT response (no intermediate updates)
  TestValidator.equals(
    "updated_at from GET should equal updated_at from PUT response",
    reloadedSettings.updated_at,
    updatedSettings.updated_at,
  );
}
