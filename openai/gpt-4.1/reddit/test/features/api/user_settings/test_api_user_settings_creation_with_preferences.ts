import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSettings";

/**
 * Validate creation of user settings with experience preferences for an
 * authenticated user.
 *
 * 1. Register and authenticate a new user using /auth/user/join (prerequisite for
 *    authorization).
 * 2. Create a user settings record using /communityPlatform/user/userSettings,
 *    providing all required experience preferences: language, theme,
 *    default_post_sort, and feature_toggles.
 * 3. Verify the settings record is created and returned fields match the initial
 *    preferences submitted.
 * 4. Ensure only one settings record exists per user by attempting to create a
 *    duplicate and expecting an error.
 */
export async function test_api_user_settings_creation_with_preferences(
  connection: api.IConnection,
) {
  // 1. Register/authenticate a user
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password,
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(user);

  // 2. Create user settings with all required preferences
  const settingsRequest = {
    language: RandomGenerator.pick(["en-US", "ko-KR", "fr-FR"]),
    theme: RandomGenerator.pick(["light", "dark", "system"]),
    default_post_sort: RandomGenerator.pick([
      "hot",
      "new",
      "top",
      "controversial",
    ]),
    feature_toggles: JSON.stringify({ beta: true, accessibility: false }),
  } satisfies ICommunityPlatformUserSettings.ICreate;

  const settings: ICommunityPlatformUserSettings =
    await api.functional.communityPlatform.user.userSettings.create(
      connection,
      {
        body: settingsRequest,
      },
    );
  typia.assert(settings);

  // 3. Validate returned settings match the request
  TestValidator.equals(
    "language matches",
    settings.language,
    settingsRequest.language,
  );
  TestValidator.equals("theme matches", settings.theme, settingsRequest.theme);
  TestValidator.equals(
    "default_post_sort matches",
    settings.default_post_sort,
    settingsRequest.default_post_sort,
  );
  TestValidator.equals(
    "feature_toggles matches",
    settings.feature_toggles,
    settingsRequest.feature_toggles,
  );
  TestValidator.equals(
    "user id matches",
    settings.community_platform_user_id,
    user.id,
  );

  // 4. Enforce unique one-to-one: creating settings again for same user fails
  await TestValidator.error("duplicate settings creation fails", async () => {
    await api.functional.communityPlatform.user.userSettings.create(
      connection,
      {
        body: settingsRequest,
      },
    );
  });
}
