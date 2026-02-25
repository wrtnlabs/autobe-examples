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

export async function test_api_community_creation_duplicate_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first owner user
  const firstOwnerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(firstOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneOwner.IJoin,
  });
  // 2. Create first community
  const firstCommunity =
    await api.functional.redditClone.owner.communities.create(
      firstOwnerConnection,
      {
        body: {
          name: "technology",
          description: "First technology community",
          icon_url: null,
        } satisfies IRedditCloneCommunity.ICreate,
      },
    );
  typia.assert(firstCommunity);
  // 3. Register second owner user
  const secondOwnerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(secondOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneOwner.IJoin,
  });
  // 4. Attempt to create duplicate community
  await TestValidator.error("duplicate community name", async () => {
    await api.functional.redditClone.owner.communities.create(
      secondOwnerConnection,
      {
        body: {
          name: "technology",
          description: "Duplicate community",
          icon_url: null,
        } satisfies IRedditCloneCommunity.ICreate,
      },
    );
  });
}
