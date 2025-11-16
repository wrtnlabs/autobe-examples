import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSettings";

/**
 * Test successful soft-deletion of a user's community platform settings by the
 * owner.
 *
 * This test covers the full happy path:
 *
 * 1. Register a new user and obtain authentication credentials
 * 2. Create a user settings record for this user
 * 3. Soft-delete the user settings by its id while authenticated as owner
 * 4. Validate that the response contains a non-null deleted_at timestamp
 * 5. Ensure subsequent deletion attempt fails (already deleted/not found)
 */
export async function test_api_user_settings_delete_success_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformUser.IJoin;

  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: joinInput });
  typia.assert(user);

  // 2. Create user settings for this user (owner)
  const settingsInput = {
    language: RandomGenerator.pick([
      "en-US",
      "ko-KR",
      "fr-FR",
      "es-ES",
      "ja-JP",
    ]) satisfies string & tags.MinLength<2> & tags.MaxLength<10>,
    theme: RandomGenerator.pick(["light", "dark", "system"]),
    default_post_sort: RandomGenerator.pick([
      "hot",
      "new",
      "top",
      "controversial",
    ]),
    feature_toggles: JSON.stringify({
      betaFeature: RandomGenerator.pick([true, false]),
      accessibility: RandomGenerator.pick([true, false]),
    }),
  } satisfies ICommunityPlatformUserSettings.ICreate;

  const settings: ICommunityPlatformUserSettings =
    await api.functional.communityPlatform.user.userSettings.create(
      connection,
      {
        body: settingsInput,
      },
    );
  typia.assert(settings);

  // 3. Soft-delete the settings with owner's authentication
  const deleted: ICommunityPlatformUserSettings =
    await api.functional.communityPlatform.user.userSettings.erase(connection, {
      userSettingsId: settings.id,
    });
  typia.assert(deleted);
  TestValidator.predicate(
    "deleted_at must be non-null after soft delete",
    typeof deleted.deleted_at === "string" && !!deleted.deleted_at,
  );

  // 4. Ensure that the settings are excluded from future (potential) queries
  // This may require API support which is not present (e.g. GET, LIST), so we skip re-query.

  // 5. Attempt to delete settings again and expect an error
  await TestValidator.error(
    "deleting already soft-deleted settings should fail",
    async () => {
      await api.functional.communityPlatform.user.userSettings.erase(
        connection,
        {
          userSettingsId: settings.id,
        },
      );
    },
  );
}
