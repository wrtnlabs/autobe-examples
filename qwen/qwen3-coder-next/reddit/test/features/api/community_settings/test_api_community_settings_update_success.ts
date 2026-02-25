import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_clone_owner_communities_create } from "../../../generate/generate_random_reddit_clone_owner_communities_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

export async function test_api_community_settings_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as owner
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      username: RandomGenerator.name(3),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneOwner.IJoin,
  });
  // 2. Create community
  const community = await api.functional.redditClone.owner.communities.create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.alphabets(8).toLowerCase(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        icon_url: null,
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Update community settings
  const newDescription = RandomGenerator.paragraph({ sentences: 5 });
  const updatedSettings =
    await api.functional.redditClone.owner.communities.settings.updateSettings(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          name: community.name.toUpperCase() + "2", // Unique name by appending
          description: newDescription,
          icon_url: null,
          privacy: "public",
        } satisfies IRedditCloneCommunity.ISettingsUpdate,
      },
    );
  typia.assert(updatedSettings);
  // 4. Validate updated settings
  TestValidator.equals(
    "community name updated",
    updatedSettings.name,
    community.name.toUpperCase() + "2",
  );
  TestValidator.equals(
    "description updated",
    updatedSettings.description,
    newDescription,
  );
  TestValidator.equals(
    "icon URL preserved",
    updatedSettings.iconUrl,
    community.iconUrl,
  );
}
