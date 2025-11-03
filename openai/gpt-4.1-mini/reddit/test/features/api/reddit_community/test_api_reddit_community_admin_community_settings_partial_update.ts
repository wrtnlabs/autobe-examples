import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySettings";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";

export async function test_api_reddit_community_admin_community_settings_partial_update(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin user
  const adminCreateBody = {
    user_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IRedditCommunityAdmin.ICreate;

  const adminAuthorized: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a new community
  const communityCreateBody = {
    name: RandomGenerator.name(1).toLowerCase().replace(/\s+/g, ""),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: communityCreateBody,
    });
  typia.assert(community);

  // 3. Partial update to community settings
  // Because no method to create initial settings is provided, use the generated id from the updated settings response to demonstrate update

  // Prepare partial update body
  const updateBody: IRedditCommunityCommunitySettings.IUpdate = {
    id: typia.random<string & tags.Format<"uuid">>(),
    reddit_community_community_id: community.id,
    setting_key: "example_setting_key",
    setting_value: RandomGenerator.name(2),
  };

  const updatedSettings: IRedditCommunityCommunitySettings =
    await api.functional.redditCommunity.admin.communities.settings.updateSettings(
      connection,
      {
        communityName: community.name,
        body: updateBody,
      },
    );
  typia.assert(updatedSettings);

  // 4. Validate that the update reflects correct community id and key
  TestValidator.equals(
    "updated community id",
    updatedSettings.reddit_community_community_id,
    community.id,
  );

  TestValidator.equals(
    "updated setting key",
    updatedSettings.setting_key,
    updateBody.setting_key,
  );

  TestValidator.equals(
    "updated setting value",
    updatedSettings.setting_value ?? null,
    updateBody.setting_value,
  );
}
