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

export async function test_api_community_update_duplicate_name_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Create two owner connections for creating communities
  const owner1Connection: api.IConnection = { host: connection.host };
  const owner2Connection: api.IConnection = { host: connection.host };
  // Register two different owners
  await authorize_owner_join(owner1Connection, {
    body: {
      email: RandomGenerator.alphabets(8) + "@test.com",
      password: "SecurePass123!",
      username: "owner1_" + RandomGenerator.alphabets(4),
      displayName: "Owner One",
    } satisfies IRedditCloneOwner.IJoin,
  });
  await authorize_owner_join(owner2Connection, {
    body: {
      email: RandomGenerator.alphabets(8) + "@test2.com",
      password: "SecurePass123!",
      username: "owner2_" + RandomGenerator.alphabets(4),
      displayName: "Owner Two",
    } satisfies IRedditCloneOwner.IJoin,
  });
  // Owner1 creates a community with a specific name
  const community1 = await api.functional.redditClone.owner.communities.update(
    owner1Connection,
    {
      communityId: typia.random<string & tags.Format<"uuid">>() + "-temp",
      body: {
        name: "test_community_" + RandomGenerator.alphabets(4),
        description: "Test community 1",
      } satisfies IRedditCloneCommunity.IUpdate,
    },
  );
  typia.assert(community1);
  // Owner2 attempts to create a community with the same name - should fail
  const community2Name = community1.name;
  await TestValidator.error("duplicate community name rejected", async () => {
    await api.functional.redditClone.owner.communities.update(
      owner2Connection,
      {
        communityId: typia.random<string & tags.Format<"uuid">>() + "-temp2",
        body: {
          name: community2Name,
          description: "This should fail",
        } satisfies IRedditCloneCommunity.IUpdate,
      },
    );
  });
}
