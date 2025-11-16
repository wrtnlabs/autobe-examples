import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformUserSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSettings";

/**
 * Validate member user localization preference updates for language and
 * timezone.
 *
 * Business purpose:
 *
 * - Ensure that a community platform member user can configure localization
 *   preferences (preferred_language and timezone) through their profile
 *   settings endpoint.
 * - Confirm that non-null values are persisted correctly.
 * - Confirm that explicitly setting preferred_language to null clears the
 *   override without altering timezone or other unrelated settings.
 *
 * Scenario steps:
 *
 * 1. Join as a new memberUser via POST /auth/memberUser/join.
 *
 *    - Use typia.random<ICommunityPlatformMemberuser.IJoin>() for realistic join
 *         payload generation.
 *    - The response ICommunityPlatformMemberuser.IAuthorized contains the
 *         `username`, which we treat as the handle for profile settings APIs.
 *    - The SDK automatically sets `connection.headers.Authorization` from the
 *         returned token; we just reuse the same connection.
 * 2. Read current settings for the new user via GET
 *    /communityPlatform/memberUser/profiles/{handle}/settings.
 *
 *    - Call api.functional.communityPlatform.memberUser.profiles.settings.at with {
 *         handle: authorized.username }.
 *    - Assert the response shape with
 *         typia.assert<ICommunityPlatformUserSettings>(). (This is mainly a
 *         contract check; we do not depend on any initial defaults for
 *         behavioral assertions.)
 * 3. Perform the first full settings update with explicit localization values via
 *    PUT /communityPlatform/memberUser/profiles/{handle}/settings.
 *
 *    - Construct a deterministic ICommunityPlatformUserSettings.IUpdate body such
 *         as: { receive_comment_reply_notifications: true,
 *         receive_post_reply_notifications: true,
 *         receive_achievement_notifications: false,
 *         receive_moderation_notifications: true,
 *         receive_marketing_notifications: false, preferred_post_sort_mode:
 *         "hot", preferred_comment_sort_mode: "new", preferred_language:
 *         "en-US", timezone: "Asia/Seoul", show_activity_in_profile: true, }
 *         using `satisfies ICommunityPlatformUserSettings.IUpdate`.
 *    - Call api.functional.communityPlatform.memberUser.profiles.settings.update
 *         with { handle, body } and assert the response via typia.assert.
 * 4. Immediately read settings again via GET to verify persistence of these
 *    values.
 *
 *    - Call `at` with the same handle.
 *    - Assert with typia.assert.
 *    - Use TestValidator.equals (title, actual, expected) to check:
 *
 *         - Preferred_language === "en-US".
 *         - Timezone === "Asia/Seoul".
 *         - All boolean flags and sort modes equal the values we sent in the first
 *                   update.
 * 5. Perform the second settings update that clears preferred_language but keeps
 *    all other settings identical.
 *
 *    - Build a new body: { receive_comment_reply_notifications: true,
 *         receive_post_reply_notifications: true,
 *         receive_achievement_notifications: false,
 *         receive_moderation_notifications: true,
 *         receive_marketing_notifications: false, preferred_post_sort_mode:
 *         "hot", preferred_comment_sort_mode: "new", preferred_language: null,
 *         timezone: "Asia/Seoul", show_activity_in_profile: true, } again
 *         `satisfies ICommunityPlatformUserSettings.IUpdate`.
 *    - Send it via `update` and assert the response with typia.assert.
 * 6. Read settings a third time to confirm null-handling and stability.
 *
 *    - GET via `at` with the same handle.
 *    - Assert via typia.assert.
 *    - TestValidator.equals checks:
 *
 *         - Preferred_language === null.
 *         - Timezone === "Asia/Seoul" (unchanged).
 *         - All boolean flags and sort modes still match the values from step 5 (no
 *                   unintended resets or modifications).
 *
 * Implementation notes:
 *
 * - Use actual-first, expected-second ordering in TestValidator.equals, with a
 *   descriptive title as the first argument.
 * - Do not manipulate connection.headers directly; rely on the SDK’s join()
 *   implementation for auth.
 * - Avoid any tests that send wrong types or omit required fields; all DTOs must
 *   satisfy the TypeScript contracts.
 */
export async function test_api_user_settings_update_language_and_timezone_preferences(
  connection: api.IConnection,
) {
  // 1. Join as a new member user and obtain the profile handle (username).
  const joinBody = typia.random<ICommunityPlatformMemberuser.IJoin>();
  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  const handle: string = authorized.username;

  // 2. Read current settings to validate the read endpoint and get a baseline.
  const initialSettings: ICommunityPlatformUserSettings =
    await api.functional.communityPlatform.memberUser.profiles.settings.at(
      connection,
      { handle },
    );
  typia.assert(initialSettings);

  // 3. First settings update: set explicit localization and other preferences.
  const firstUpdateBody = {
    receive_comment_reply_notifications: true,
    receive_post_reply_notifications: true,
    receive_achievement_notifications: false,
    receive_moderation_notifications: true,
    receive_marketing_notifications: false,
    preferred_post_sort_mode: "hot",
    preferred_comment_sort_mode: "new",
    preferred_language: "en-US",
    timezone: "Asia/Seoul",
    show_activity_in_profile: true,
  } satisfies ICommunityPlatformUserSettings.IUpdate;

  const afterFirstUpdate: ICommunityPlatformUserSettings =
    await api.functional.communityPlatform.memberUser.profiles.settings.update(
      connection,
      {
        handle,
        body: firstUpdateBody,
      },
    );
  typia.assert(afterFirstUpdate);

  // 4. Read settings again and assert persistence of the first update.
  const afterFirstGet: ICommunityPlatformUserSettings =
    await api.functional.communityPlatform.memberUser.profiles.settings.at(
      connection,
      { handle },
    );
  typia.assert(afterFirstGet);

  TestValidator.equals(
    "preferred_language should persist as 'en-US' after first update",
    afterFirstGet.preferred_language,
    "en-US",
  );
  TestValidator.equals(
    "timezone should persist as 'Asia/Seoul' after first update",
    afterFirstGet.timezone,
    "Asia/Seoul",
  );
  TestValidator.equals(
    "receive_comment_reply_notifications should match first update",
    afterFirstGet.receive_comment_reply_notifications,
    firstUpdateBody.receive_comment_reply_notifications,
  );
  TestValidator.equals(
    "receive_post_reply_notifications should match first update",
    afterFirstGet.receive_post_reply_notifications,
    firstUpdateBody.receive_post_reply_notifications,
  );
  TestValidator.equals(
    "receive_achievement_notifications should match first update",
    afterFirstGet.receive_achievement_notifications,
    firstUpdateBody.receive_achievement_notifications,
  );
  TestValidator.equals(
    "receive_moderation_notifications should match first update",
    afterFirstGet.receive_moderation_notifications,
    firstUpdateBody.receive_moderation_notifications,
  );
  TestValidator.equals(
    "receive_marketing_notifications should match first update",
    afterFirstGet.receive_marketing_notifications,
    firstUpdateBody.receive_marketing_notifications,
  );
  TestValidator.equals(
    "preferred_post_sort_mode should match first update",
    afterFirstGet.preferred_post_sort_mode,
    firstUpdateBody.preferred_post_sort_mode,
  );
  TestValidator.equals(
    "preferred_comment_sort_mode should match first update",
    afterFirstGet.preferred_comment_sort_mode,
    firstUpdateBody.preferred_comment_sort_mode,
  );
  TestValidator.equals(
    "show_activity_in_profile should match first update",
    afterFirstGet.show_activity_in_profile,
    firstUpdateBody.show_activity_in_profile,
  );

  // 5. Second settings update: clear preferred_language by setting it to null
  //    while keeping all other fields identical.
  const secondUpdateBody = {
    receive_comment_reply_notifications: true,
    receive_post_reply_notifications: true,
    receive_achievement_notifications: false,
    receive_moderation_notifications: true,
    receive_marketing_notifications: false,
    preferred_post_sort_mode: "hot",
    preferred_comment_sort_mode: "new",
    preferred_language: null,
    timezone: "Asia/Seoul",
    show_activity_in_profile: true,
  } satisfies ICommunityPlatformUserSettings.IUpdate;

  const afterSecondUpdate: ICommunityPlatformUserSettings =
    await api.functional.communityPlatform.memberUser.profiles.settings.update(
      connection,
      {
        handle,
        body: secondUpdateBody,
      },
    );
  typia.assert(afterSecondUpdate);

  // 6. Final GET to confirm that preferred_language is null and others stable.
  const finalSettings: ICommunityPlatformUserSettings =
    await api.functional.communityPlatform.memberUser.profiles.settings.at(
      connection,
      { handle },
    );
  typia.assert(finalSettings);

  TestValidator.equals(
    "preferred_language should be null after clearing in second update",
    finalSettings.preferred_language,
    null,
  );
  TestValidator.equals(
    "timezone should remain 'Asia/Seoul' after second update",
    finalSettings.timezone,
    "Asia/Seoul",
  );
  TestValidator.equals(
    "receive_comment_reply_notifications should remain stable after second update",
    finalSettings.receive_comment_reply_notifications,
    secondUpdateBody.receive_comment_reply_notifications,
  );
  TestValidator.equals(
    "receive_post_reply_notifications should remain stable after second update",
    finalSettings.receive_post_reply_notifications,
    secondUpdateBody.receive_post_reply_notifications,
  );
  TestValidator.equals(
    "receive_achievement_notifications should remain stable after second update",
    finalSettings.receive_achievement_notifications,
    secondUpdateBody.receive_achievement_notifications,
  );
  TestValidator.equals(
    "receive_moderation_notifications should remain stable after second update",
    finalSettings.receive_moderation_notifications,
    secondUpdateBody.receive_moderation_notifications,
  );
  TestValidator.equals(
    "receive_marketing_notifications should remain stable after second update",
    finalSettings.receive_marketing_notifications,
    secondUpdateBody.receive_marketing_notifications,
  );
  TestValidator.equals(
    "preferred_post_sort_mode should remain stable after second update",
    finalSettings.preferred_post_sort_mode,
    secondUpdateBody.preferred_post_sort_mode,
  );
  TestValidator.equals(
    "preferred_comment_sort_mode should remain stable after second update",
    finalSettings.preferred_comment_sort_mode,
    secondUpdateBody.preferred_comment_sort_mode,
  );
  TestValidator.equals(
    "show_activity_in_profile should remain stable after second update",
    finalSettings.show_activity_in_profile,
    secondUpdateBody.show_activity_in_profile,
  );
}
