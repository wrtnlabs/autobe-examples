import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_community_deletion_by_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(owner);
  // 2. Create attacker member
  const attackerConnection: api.IConnection = { host: connection.host };
  const attacker = await authorize_member_join(attackerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(attacker);
  // 3. Owner creates a community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // Verify community ownership
  TestValidator.equals("community owner matches", community.owner.id, owner.id);
  // 4. Attacker attempts to delete the community (should fail)
  await TestValidator.error("non-owner deletion should fail", async () => {
    await api.functional.redditPlatform.member.communities.erase(
      attackerConnection,
      {
        communityId: community.id,
      },
    );
  });
  // 5. Verify the community still exists after failed deletion attempt
  // Since owner can successfully delete it, the community must still exist
  const deletedCommunity =
    await api.functional.redditPlatform.member.communities.erase(
      ownerConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(deletedCommunity);
  // Verify the deleted community matches what we created
  TestValidator.equals(
    "deleted community matches original",
    deletedCommunity.id,
    community.id,
  );
}
