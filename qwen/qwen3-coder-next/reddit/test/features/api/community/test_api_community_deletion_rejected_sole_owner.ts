import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";

export async function test_api_community_deletion_rejected_sole_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member as sole owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerInfo = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(ownerInfo);
  // 2. Create community with sole ownership
  const community = await generate_random_reddit_like_member_communities_create(
    ownerConnection,
    {
      body: {
        name: (typia.random<string & tags.Pattern<"^[a-zA-Z0-9_]+$">>() satisfies string as string & tags.MinLength<1> & tags.MaxLength<50> & tags.Pattern<"^[a-zA-Z0-9_]+$">),
      },
    },
  );
  typia.assert(community);
  TestValidator.equals("owner matches", community.owner.id, ownerInfo.id);
  // 3. Attempt to delete community as sole owner (should fail)
  await TestValidator.error("community_has_sole_owner error", async () => {
    await api.functional.redditLike.member.communities.erase(ownerConnection, {
      name: community.name,
    });
  });
  // 4. Verify community still exists
  const retrieved = await api.functional.redditLike.member.communities.create(
    ownerConnection,
    {
      body: {
        name: community.name,
      },
    },
  );
  typia.assert(retrieved);
  TestValidator.equals("community still exists", retrieved.id, community.id);
}