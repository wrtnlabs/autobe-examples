import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPostAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostAnalytic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

export async function test_api_community_owner_post_analytics_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create a community owner (actor A) who will be unauthorized caller
  const communityOwnerConnectionA: api.IConnection = { host: connection.host };
  const communityOwnerA = await authorize_community_owner_join(
    communityOwnerConnectionA,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
      } satisfies IRedditCommunityCommunityOwner.IJoin,
    },
  );
  // Setup: Create a member (actor B) who will own the target community
  const memberConnectionB: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberConnectionB, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // Setup: Create a community owned by member B (actor B)
  const communityB =
    await generate_random_reddit_community_member_communities_create(
      memberConnectionB,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  // Test: Attempt to access community B's analytics using community owner A's credentials
  // This should fail with 403 Forbidden because community owner A does not own community B
  const body: IRedditCommunityPostAnalytic.IRequest = {
    communityId: communityB.id,
  };
  await TestValidator.httpError(
    "community owner cannot access foreign analytics",
    403,
    async () => {
      await api.functional.redditCommunity.communityOwner.communities.analytics.posts.search(
        communityOwnerConnectionA,
        {
          communityId: communityB.id,
          body,
        },
      );
    },
  );
}
