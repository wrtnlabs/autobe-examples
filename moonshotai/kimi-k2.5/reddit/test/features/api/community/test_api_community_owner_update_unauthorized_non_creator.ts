import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";

export async function test_api_community_owner_update_unauthorized_non_creator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as Owner A (community creator)
  const ownerAConnection: api.IConnection = { host: connection.host };
  const ownerA = await authorize_owner_join(ownerAConnection, {});
  typia.assert(ownerA);
  // Step 2: Owner A creates a community
  const community = await generate_random_reddit_like_member_communities_create(
    ownerAConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Authenticate as Owner B (non-creator who will attempt unauthorized update)
  const ownerBConnection: api.IConnection = { host: connection.host };
  const ownerB = await authorize_owner_join(ownerBConnection, {});
  typia.assert(ownerB);
  // Step 4 & 5: Owner B attempts to update Owner A's community - should fail with 403
  await TestValidator.httpError(
    "non-creator owner should receive 403 when updating another owner's community",
    403,
    async () => {
      await api.functional.redditLike.owner.communities.update(
        ownerBConnection,
        {
          communityId: community.id,
          body: {
            name: RandomGenerator.name(),
            description: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IRedditLikeCommunity.IUpdate,
        },
      );
    },
  );
}
