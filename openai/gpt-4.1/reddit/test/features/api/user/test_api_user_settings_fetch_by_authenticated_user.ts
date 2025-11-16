import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSettings";

/**
 * Validate authenticated user can fetch their own user settings by ID.
 *
 * The test covers self-service onboarding (user registration), creation of user
 * settings with personalized preferences, and then retrieval by ID. The
 * following validations are performed:
 *
 * 1. Register a user and retrieve authentication tokens and user id
 * 2. As the authenticated user, create a user settings record specifying language,
 *    theme, default_post_sort, and feature_toggles
 * 3. Fetch user settings by the returned id
 * 4. Assert the returned user settings match the created settings (per-field data
 *    validation)
 * 5. Verify audit fields (created_at, updated_at) are valid ISO timestamps and
 *    referential integrity is maintained (community_platform_user_id =
 *    registered user id).
 */
export async function test_api_user_settings_fetch_by_authenticated_user(
  connection: api.IConnection,
) {
  // 1. Register new user and obtain principal info and tokens
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const userJoin: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(userJoin);
  const userId = userJoin.id;

  // 2. Create user settings with custom preferences
  const createBody = {
    language: RandomGenerator.pick([
      "en-US",
      "ko-KR",
      "ja-JP",
      "de-DE",
    ] as const),
    theme: RandomGenerator.pick(["light", "dark", "system"] as const),
    default_post_sort: RandomGenerator.pick([
      "hot",
      "new",
      "top",
      "controversial",
    ] as const),
    feature_toggles: JSON.stringify({
      beta: true,
      accessibility: RandomGenerator.pick([true, false] as const),
    }),
  } satisfies ICommunityPlatformUserSettings.ICreate;
  const createdSettings: ICommunityPlatformUserSettings =
    await api.functional.communityPlatform.user.userSettings.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdSettings);

  // 3. Fetch the user settings by ID (as authenticated user)
  const fetchedSettings: ICommunityPlatformUserSettings =
    await api.functional.communityPlatform.user.userSettings.at(connection, {
      userSettingsId: createdSettings.id,
    });
  typia.assert(fetchedSettings);

  // 4. Assert that all key fields (preferences) exactly match the initially set values
  TestValidator.equals(
    "userSettings ID matches createdSettings",
    fetchedSettings.id,
    createdSettings.id,
  );
  TestValidator.equals(
    "user link matches principal",
    fetchedSettings.community_platform_user_id,
    userId,
  );
  TestValidator.equals(
    "language matches",
    fetchedSettings.language,
    createBody.language,
  );
  TestValidator.equals(
    "theme matches",
    fetchedSettings.theme,
    createBody.theme,
  );
  TestValidator.equals(
    "default_post_sort matches",
    fetchedSettings.default_post_sort,
    createBody.default_post_sort,
  );
  TestValidator.equals(
    "feature_toggles matches",
    fetchedSettings.feature_toggles,
    createBody.feature_toggles,
  );
  // 5. Validate audit fields
  TestValidator.predicate(
    "created_at is valid ISO timestamp",
    typeof fetchedSettings.created_at === "string" &&
      !isNaN(Date.parse(fetchedSettings.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO timestamp",
    typeof fetchedSettings.updated_at === "string" &&
      !isNaN(Date.parse(fetchedSettings.updated_at)),
  );
  TestValidator.equals(
    "deleted_at is null or undefined",
    fetchedSettings.deleted_at,
    null,
  );
}
