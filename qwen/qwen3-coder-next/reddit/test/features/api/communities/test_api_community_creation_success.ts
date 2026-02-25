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

export async function test_api_community_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new owner user
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    username: `owner_${typia.random<string & tags.Format<"uuid">>()}`,
    displayName: `Owner ${typia.random<string & tags.Format<"uuid">>()}`,
  } satisfies IRedditCloneOwner.IJoin;
  await authorize_owner_join(ownerConnection, { body: ownerCredentials });
  // Step 2: Create a community with valid data
  const communityName = `community_${typia.random<string & tags.Format<"uuid">>()}`;
  const communityDescription = RandomGenerator.paragraph({ sentences: 3 });
  const createdCommunity =
    await api.functional.redditClone.owner.communities.create(ownerConnection, {
      body: {
        name: communityName,
        description: communityDescription,
      } satisfies IRedditCloneCommunity.ICreate,
    });
  typia.assert(createdCommunity);
  // Step 3: Validate response structure
  TestValidator.equals(
    "community name matches",
    createdCommunity.name,
    communityName,
  );
  TestValidator.equals(
    "community description matches",
    createdCommunity.description,
    communityDescription,
  );
  TestValidator.predicate(
    "has valid UUID id",
    /^[0-9a-f-]{36}$/i.test(createdCommunity.id),
  );
  TestValidator.equals(
    "owner id matches authenticated user",
    createdCommunity.owner.id,
    ownerCredentials.username,
  );
  TestValidator.equals(
    "subscriber count initialized to 1",
    createdCommunity.subscriberCount,
    1,
  );
  TestValidator.predicate(
    "has valid created timestamp",
    !isNaN(new Date(createdCommunity.createdAt).getTime()),
  );
  TestValidator.predicate(
    "has valid updated timestamp",
    !isNaN(new Date(createdCommunity.updatedAt).getTime()),
  );
}
