import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySettings";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

export async function test_api_reddit_community_replace_settings_by_admin(
  connection: api.IConnection,
) {
  // 1. Create a user first (needed for admin creation and community ownership)
  const userAuthorized: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: typia.random<IRedditCommunityUser.ICreate>(),
    });
  typia.assert(userAuthorized);

  // 2. Create an admin account linked to created user
  const adminAuthorized: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        user_id: userAuthorized.id,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(adminAuthorized);

  // 3. Create a community by the user
  const newCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: {
        name: `community_${RandomGenerator.alphaNumeric(8)}`,
        description: RandomGenerator.paragraph({ sentences: 6 }),
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(newCommunity);

  // 4. Prepare settings keys and values for full replacement
  const nowIso = new Date().toISOString();
  // Define realistic setting keys to replace
  const settingKeys = [
    "allow_posting",
    "allow_comments",
    "is_public",
    "theme_color",
    "welcome_message",
  ];

  // 5. For each setting key, replace the setting via the admin API
  for (const key of settingKeys) {
    // Compose a setting create object
    const newSetting: IRedditCommunityCommunitySettings.ICreate = {
      reddit_community_community_id: newCommunity.id,
      setting_key: key,
      setting_value:
        key === "welcome_message"
          ? RandomGenerator.paragraph({
              sentences: 1,
              wordMin: 10,
              wordMax: 25,
            })
          : key === "theme_color"
            ? `#${RandomGenerator.alphaNumeric(6)}`
            : Math.random() < 0.5
              ? "true"
              : "false",
      created_at: nowIso,
      updated_at: nowIso,
    } satisfies IRedditCommunityCommunitySettings.ICreate;

    // Replace the setting
    const replacedSetting =
      await api.functional.redditCommunity.admin.communities.settings.replaceSettings(
        connection,
        {
          communityName: newCommunity.name,
          body: newSetting,
        },
      );
    typia.assert(replacedSetting);

    // Validate replaced setting matches what was sent
    TestValidator.equals(
      `setting_key ${key} replaced correctly`,
      replacedSetting.setting_key,
      newSetting.setting_key,
    );
    TestValidator.equals(
      `setting_value ${key} replaced correctly`,
      replacedSetting.setting_value,
      newSetting.setting_value,
    );
    TestValidator.equals(
      `community_id ${key} replaced correctly`,
      replacedSetting.reddit_community_community_id,
      newSetting.reddit_community_community_id,
    );
    TestValidator.equals(
      `created_at ${key} replaced correctly`,
      replacedSetting.created_at,
      newSetting.created_at,
    );
    TestValidator.equals(
      `updated_at ${key} replaced correctly`,
      replacedSetting.updated_at,
      newSetting.updated_at,
    );
  }
}
