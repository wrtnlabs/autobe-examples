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

export async function test_api_community_owner_update_duplicate_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as Owner A and create Community A with a unique name
  const ownerConnectionA: api.IConnection = { host: connection.host };
  const ownerA = await authorize_owner_join(ownerConnectionA, {
    body: {},
  });
  typia.assert(ownerA);
  const communityA =
    await generate_random_reddit_like_member_communities_create(
      ownerConnectionA,
      {
        body: {
          name: "CommunityAUniqueName",
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(communityA);
  // Step 2: Authenticate as Owner B and create Community B
  const ownerConnectionB: api.IConnection = { host: connection.host };
  const ownerB = await authorize_owner_join(ownerConnectionB, {
    body: {},
  });
  typia.assert(ownerB);
  const communityB =
    await generate_random_reddit_like_member_communities_create(
      ownerConnectionB,
      {
        body: {
          name: "CommunityBInitialName",
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(communityB);
  // Step 3: Try updating Community B's name to match Community A's name - should reject with 409
  await TestValidator.httpError(
    "Should return 409 Conflict when updating community name to existing name",
    409,
    async () => {
      await api.functional.redditLike.owner.communities.update(
        ownerConnectionB,
        {
          communityId: communityB.id,
          body: {
            name: communityA.name,
          } satisfies IRedditLikeCommunity.IUpdate,
        },
      );
    },
  );
  // Validate that the update was rejected and Community B still has its original name
  TestValidator.equals(
    "Community B name should remain unchanged",
    communityB.name,
    "CommunityBInitialName",
  );
}
