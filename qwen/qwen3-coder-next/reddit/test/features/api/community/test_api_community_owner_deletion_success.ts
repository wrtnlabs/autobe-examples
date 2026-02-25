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

export async function test_api_community_owner_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register owner user
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    username: typia.random<string & tags.Format<"uuid">>(),
    displayName: RandomGenerator.name(),
  } satisfies IRedditCloneOwner.IJoin;
  const ownerAuth = await authorize_owner_join(ownerConnection, {
    body: ownerCredentials,
  });
  typia.assert(ownerAuth);
  // 2. Create community
  const community = await generate_random_reddit_clone_owner_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_url: null,
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Delete community
  await api.functional.redditClone.owner.communities.erase(ownerConnection, {
    communityId: community.id,
  });
  // 4. Verify community access returns 404
  await TestValidator.error("community not found after deletion", async () => {
    await api.functional.redditClone.owner.communities.erase(ownerConnection, {
      communityId: community.id,
    });
  });
}
