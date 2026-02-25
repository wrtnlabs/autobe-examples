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

export async function test_api_owner_community_unban_already_inactive(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    username: RandomGenerator.alphaNumeric(8),
    displayName: RandomGenerator.name(),
  } satisfies IRedditCloneOwner.IJoin;
  const ownerAuth = await authorize_owner_join(ownerConnection, {
    body: ownerCredentials,
  });
  typia.assert(ownerAuth);
  // 2. Create a community
  const communityData = {
    name: "test-community-" + RandomGenerator.alphaNumeric(6),
    description: "Test community for unban validation",
  } satisfies IRedditCloneCommunity.ICreate;
  const community = await api.functional.redditClone.owner.communities.create(
    ownerConnection,
    { body: communityData },
  );
  typia.assert(community);
  // 3. Create another user to unban (simulate being banned previously)
  const anotherConnection: api.IConnection = { host: connection.host };
  const anotherCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    username: RandomGenerator.alphaNumeric(8),
    displayName: RandomGenerator.name(),
  } satisfies IRedditCloneOwner.IJoin;
  const anotherAuth = await authorize_owner_join(anotherConnection, {
    body: anotherCredentials,
  });
  typia.assert(anotherAuth);
  // 4. Try to unban user who was never banned - should return 409 Conflict
  await TestValidator.error("non-existent ban should return 409", async () => {
    await api.functional.redditClone.owner.communities.bans.erase(
      ownerConnection,
      {
        communityId: community.id,
        userId: anotherAuth.id,
      },
    );
  });
}
