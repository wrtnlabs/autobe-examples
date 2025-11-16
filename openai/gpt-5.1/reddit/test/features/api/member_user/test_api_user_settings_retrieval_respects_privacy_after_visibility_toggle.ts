import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformUserSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSettings";

/**
 * Validate that user settings retrieval respects the show_activity_in_profile
 * privacy flag after it has been toggled.
 *
 * Business context: A community platform member user can configure their
 * account-level preferences and profile visibility via the user settings system
 * backed by community_platform_user_settings. One of the key privacy-related
 * flags is show_activity_in_profile, which controls whether detailed recent
 * activity appears on their public profile. When the user updates this flag
 * through the settings update endpoint, subsequent reads via the settings
 * retrieval endpoint must reflect the updated value. This test verifies that
 * the update and retrieval endpoints are correctly wired through the profile
 * handle and that the settings row persists changes as expected.
 *
 * Steps:
 *
 * 1. Register and authenticate a new memberUser via POST /auth/memberUser/join.
 *
 *    - Build a realistic ICommunityPlatformMemberuser.IJoin payload with username,
 *         email, password, href, and referrer.
 *    - Call api.functional.auth.memberUser.join, which also attaches an
 *         Authorization token to the connection.
 *    - Capture the returned username from ICommunityPlatformMemberuser.IAuthorized
 *         to use as the profile handle for settings operations.
 * 2. Update the user settings for the new profile to set show_activity_in_profile
 *    to false.
 *
 *    - Call api.functional.communityPlatform.memberUser.profiles.settings.update
 *         with handle equal to the captured username.
 *    - Provide a body that satisfies ICommunityPlatformUserSettings.IUpdate,
 *         explicitly setting show_activity_in_profile: false and filling in
 *         other fields with sensible defaults (e.g., notification flags, sort
 *         modes, preferred_language, timezone) as needed.
 *    - Assert the update response with typia.assert to ensure it matches
 *         ICommunityPlatformUserSettings and optionally sanity check key
 *         fields.
 * 3. Retrieve the user settings via GET
 *    /communityPlatform/memberUser/profiles/{handle}/settings.
 *
 *    - Call api.functional.communityPlatform.memberUser.profiles.settings.at with
 *         the same handle.
 *    - Assert the response type with typia.assert.
 * 4. Verify that show_activity_in_profile is persisted as false.
 *
 *    - Use TestValidator.equals with a descriptive title to check that
 *         retrievedSettings.show_activity_in_profile is false.
 *    - Optionally verify that some other fields (such as sort mode or notification
 *         flags) match what was sent in the update for additional confidence in
 *         persistence behavior.
 * 5. Optionally, toggle show_activity_in_profile back to true and verify.
 *
 *    - Perform another update call setting show_activity_in_profile: true.
 *    - Retrieve settings again and assert that show_activity_in_profile is now true,
 *         demonstrating that repeated toggles are respected.
 */
export async function test_api_user_settings_retrieval_respects_privacy_after_visibility_toggle(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new member user.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(12),
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  const handle: string = authorized.username;

  // 2. Update settings: set show_activity_in_profile to false with other
  // realistic preferences.
  const firstUpdateBody = {
    receive_comment_reply_notifications: true,
    receive_post_reply_notifications: true,
    receive_achievement_notifications: true,
    receive_moderation_notifications: true,
    receive_marketing_notifications: false,
    preferred_post_sort_mode: "hot",
    preferred_comment_sort_mode: "top",
    preferred_language: "en-US",
    timezone: "Asia/Seoul",
    show_activity_in_profile: false,
  } satisfies ICommunityPlatformUserSettings.IUpdate;

  const updatedSettingsFalse: ICommunityPlatformUserSettings =
    await api.functional.communityPlatform.memberUser.profiles.settings.update(
      connection,
      {
        handle,
        body: firstUpdateBody,
      },
    );
  typia.assert(updatedSettingsFalse);

  // 3. Retrieve settings via GET and assert type.
  const retrievedSettingsFalse: ICommunityPlatformUserSettings =
    await api.functional.communityPlatform.memberUser.profiles.settings.at(
      connection,
      {
        handle,
      },
    );
  typia.assert(retrievedSettingsFalse);

  // 4. Verify that show_activity_in_profile is persisted as false and other
  // key fields match the update payload.
  TestValidator.equals(
    "show_activity_in_profile should be false after first update",
    retrievedSettingsFalse.show_activity_in_profile,
    false,
  );
  TestValidator.equals(
    "preferred_post_sort_mode should match first update",
    retrievedSettingsFalse.preferred_post_sort_mode,
    firstUpdateBody.preferred_post_sort_mode,
  );
  TestValidator.equals(
    "preferred_comment_sort_mode should match first update",
    retrievedSettingsFalse.preferred_comment_sort_mode,
    firstUpdateBody.preferred_comment_sort_mode,
  );
  TestValidator.equals(
    "receive_marketing_notifications should match first update",
    retrievedSettingsFalse.receive_marketing_notifications,
    firstUpdateBody.receive_marketing_notifications,
  );

  // 5. Toggle show_activity_in_profile back to true and verify.
  const secondUpdateBody = {
    show_activity_in_profile: true,
  } satisfies ICommunityPlatformUserSettings.IUpdate;

  const updatedSettingsTrue: ICommunityPlatformUserSettings =
    await api.functional.communityPlatform.memberUser.profiles.settings.update(
      connection,
      {
        handle,
        body: secondUpdateBody,
      },
    );
  typia.assert(updatedSettingsTrue);

  const retrievedSettingsTrue: ICommunityPlatformUserSettings =
    await api.functional.communityPlatform.memberUser.profiles.settings.at(
      connection,
      {
        handle,
      },
    );
  typia.assert(retrievedSettingsTrue);

  TestValidator.equals(
    "show_activity_in_profile should be true after second update",
    retrievedSettingsTrue.show_activity_in_profile,
    true,
  );
}
