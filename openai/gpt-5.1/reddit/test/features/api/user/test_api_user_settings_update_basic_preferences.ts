import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformUserSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSettings";

/**
 * Validate that an authenticated member user can update their basic community
 * platform settings preferences for their own profile.
 *
 * Business workflow:
 *
 * 1. Register a new member user via POST /auth/memberUser/join to create the
 *    account and initial session, capturing the username that will be used as
 *    the profile handle.
 * 2. Construct an ICommunityPlatformUserSettings.IUpdate payload that sets all
 *    major boolean notification and visibility flags, as well as preferred sort
 *    modes and localization fields (preferred_language, timezone).
 * 3. Call PUT /communityPlatform/memberUser/profiles/{handle}/settings with the
 *    authenticated connection and the constructed payload.
 * 4. Assert that the returned ICommunityPlatformUserSettings reflects the
 *    submitted values with no unexpected overrides.
 * 5. Re-apply the same update to verify idempotence and persistence of the
 *    settings.
 */
export async function test_api_user_settings_update_basic_preferences(
  connection: api.IConnection,
) {
  // 1. Register a new member user (join) to obtain an authenticated session.
  const username: string = RandomGenerator.alphabets(8);
  const email: string = typia.random<string & tags.Format<"email">>();

  const joinBody = {
    username,
    email,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Build a complete settings update payload with explicit preferences.
  const updateBody = {
    receive_comment_reply_notifications: true,
    receive_post_reply_notifications: true,
    receive_achievement_notifications: false,
    receive_moderation_notifications: true,
    receive_marketing_notifications: false,
    preferred_post_sort_mode: "hot",
    preferred_comment_sort_mode: "top",
    preferred_language: "en-US",
    timezone: "Asia/Seoul",
    show_activity_in_profile: true,
  } satisfies ICommunityPlatformUserSettings.IUpdate;

  // 3. Call the settings update endpoint for this user's profile handle.
  const settings: ICommunityPlatformUserSettings =
    await api.functional.communityPlatform.memberUser.profiles.settings.update(
      connection,
      {
        handle: username,
        body: updateBody,
      },
    );
  typia.assert(settings);

  // 4. Validate that all returned fields match the update payload.
  TestValidator.equals(
    "receive_comment_reply_notifications must match",
    settings.receive_comment_reply_notifications,
    updateBody.receive_comment_reply_notifications,
  );
  TestValidator.equals(
    "receive_post_reply_notifications must match",
    settings.receive_post_reply_notifications,
    updateBody.receive_post_reply_notifications,
  );
  TestValidator.equals(
    "receive_achievement_notifications must match",
    settings.receive_achievement_notifications,
    updateBody.receive_achievement_notifications,
  );
  TestValidator.equals(
    "receive_moderation_notifications must match",
    settings.receive_moderation_notifications,
    updateBody.receive_moderation_notifications,
  );
  TestValidator.equals(
    "receive_marketing_notifications must match",
    settings.receive_marketing_notifications,
    updateBody.receive_marketing_notifications,
  );
  TestValidator.equals(
    "preferred_post_sort_mode must match",
    settings.preferred_post_sort_mode,
    updateBody.preferred_post_sort_mode,
  );
  TestValidator.equals(
    "preferred_comment_sort_mode must match",
    settings.preferred_comment_sort_mode,
    updateBody.preferred_comment_sort_mode,
  );
  TestValidator.equals(
    "preferred_language must match",
    settings.preferred_language,
    updateBody.preferred_language,
  );
  TestValidator.equals(
    "timezone must match",
    settings.timezone,
    updateBody.timezone,
  );
  TestValidator.equals(
    "show_activity_in_profile must match",
    settings.show_activity_in_profile,
    updateBody.show_activity_in_profile,
  );

  // 5. Re-apply the same update to verify idempotence.
  const settingsAgain: ICommunityPlatformUserSettings =
    await api.functional.communityPlatform.memberUser.profiles.settings.update(
      connection,
      {
        handle: username,
        body: updateBody,
      },
    );
  typia.assert(settingsAgain);

  TestValidator.equals(
    "second update should keep receive_comment_reply_notifications",
    settingsAgain.receive_comment_reply_notifications,
    updateBody.receive_comment_reply_notifications,
  );
  TestValidator.equals(
    "second update should keep receive_post_reply_notifications",
    settingsAgain.receive_post_reply_notifications,
    updateBody.receive_post_reply_notifications,
  );
  TestValidator.equals(
    "second update should keep receive_achievement_notifications",
    settingsAgain.receive_achievement_notifications,
    updateBody.receive_achievement_notifications,
  );
  TestValidator.equals(
    "second update should keep receive_moderation_notifications",
    settingsAgain.receive_moderation_notifications,
    updateBody.receive_moderation_notifications,
  );
  TestValidator.equals(
    "second update should keep receive_marketing_notifications",
    settingsAgain.receive_marketing_notifications,
    updateBody.receive_marketing_notifications,
  );
  TestValidator.equals(
    "second update should keep preferred_post_sort_mode",
    settingsAgain.preferred_post_sort_mode,
    updateBody.preferred_post_sort_mode,
  );
  TestValidator.equals(
    "second update should keep preferred_comment_sort_mode",
    settingsAgain.preferred_comment_sort_mode,
    updateBody.preferred_comment_sort_mode,
  );
  TestValidator.equals(
    "second update should keep preferred_language",
    settingsAgain.preferred_language,
    updateBody.preferred_language,
  );
  TestValidator.equals(
    "second update should keep timezone",
    settingsAgain.timezone,
    updateBody.timezone,
  );
  TestValidator.equals(
    "second update should keep show_activity_in_profile",
    settingsAgain.show_activity_in_profile,
    updateBody.show_activity_in_profile,
  );
}
