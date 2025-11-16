import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSettings";

/**
 * Validate that an authenticated user can update their own user settings
 * (experience preferences and feature toggles) and that unauthorized or
 * cross-user updates are forbidden.
 *
 * Steps:
 *
 * 1. Register User A (get JWT token)
 * 2. As User A, create initial settings
 * 3. Update at least two settings fields via the authenticated endpoint
 * 4. Ensure response reflects updated values and updated_at changed
 * 5. Check update is forbidden if no auth token
 * 6. Register User B and check updating another user's settings is forbidden
 */
export async function test_api_user_settings_update_success_by_authenticated_user(
  connection: api.IConnection,
) {
  // 1. Register User A (obtain token)
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userAPassword = RandomGenerator.alphaNumeric(10);
  const userAJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: userAEmail,
      password: userAPassword,
    },
  });
  typia.assert(userAJoin);
  const authTokenA: IAuthorizationToken = userAJoin.token;
  const userAId: string & tags.Format<"uuid"> = userAJoin.id;

  // 2. Create User A's settings
  const initialSettingsBody = {
    language: "en-US",
    theme: "light",
    default_post_sort: "hot",
    feature_toggles: JSON.stringify({ beta: false, darkMode: false }),
  } satisfies ICommunityPlatformUserSettings.ICreate;
  const createdSettings =
    await api.functional.communityPlatform.user.userSettings.create(
      connection,
      {
        body: initialSettingsBody,
      },
    );
  typia.assert(createdSettings);

  // 3. Update at least two settings fields
  const updateSettingsBody = {
    theme: "dark",
    default_post_sort: "new",
  } satisfies ICommunityPlatformUserSettings.IUpdate;
  const updatedSettings =
    await api.functional.communityPlatform.user.userSettings.update(
      connection,
      {
        userSettingsId: createdSettings.id,
        body: updateSettingsBody,
      },
    );
  typia.assert(updatedSettings);

  // 4. Verify updated settings fields and updated_at changed
  TestValidator.equals(
    "theme was updated",
    updatedSettings.theme,
    updateSettingsBody.theme,
  );
  TestValidator.equals(
    "default_post_sort was updated",
    updatedSettings.default_post_sort,
    updateSettingsBody.default_post_sort,
  );
  TestValidator.notEquals(
    "updated_at timestamp was changed",
    createdSettings.updated_at,
    updatedSettings.updated_at,
  );

  // 5. Attempt update with unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot update settings",
    async () => {
      await api.functional.communityPlatform.user.userSettings.update(
        unauthConn,
        {
          userSettingsId: createdSettings.id,
          body: { theme: "light" },
        },
      );
    },
  );

  // 6. Register User B and attempt cross-user update
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userBPassword = RandomGenerator.alphaNumeric(10);
  const userBJoin = await api.functional.auth.user.join(connection, {
    body: { email: userBEmail, password: userBPassword },
  });
  typia.assert(userBJoin);
  const authTokenB: IAuthorizationToken = userBJoin.token;
  // Connection has latest token -- try to update User A's settings as User B
  await TestValidator.error(
    "other user cannot update another user's settings",
    async () => {
      await api.functional.communityPlatform.user.userSettings.update(
        connection,
        {
          userSettingsId: createdSettings.id,
          body: { theme: "system" },
        },
      );
    },
  );
}
