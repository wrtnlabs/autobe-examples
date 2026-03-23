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

export async function test_api_community_update_by_non_owner_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A creates community
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      displayName: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditLikeMember.IJoin,
  });
  const community = await api.functional.redditLike.member.communities.create(
    memberAConnection,
    {
      body: {
        name: RandomGenerator.alphaNumeric(8),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 2. Member B (separate account) attempts to update community
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      displayName: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditLikeMember.IJoin,
  });
  // 3. Verify 403 Forbidden response
  await TestValidator.error("non-owner update rejected", async () => {
    await api.functional.redditLike.member.communities.update(
      memberBConnection,
      {
        communityName: community.name,
        body: {
          description: "Hacked description",
        } satisfies IRedditLikeCommunity.IUpdate,
      },
    );
  });
  // 4. Verify community data unchanged
  const updatedCommunity =
    await api.functional.redditLike.member.communities.update(
      memberAConnection,
      {
        communityName: community.name,
        body: {
          description: "Original description",
        } satisfies IRedditLikeCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity);
  TestValidator.equals(
    "community unchanged by unauthorized user",
    updatedCommunity.name,
    community.name,
  );
}
