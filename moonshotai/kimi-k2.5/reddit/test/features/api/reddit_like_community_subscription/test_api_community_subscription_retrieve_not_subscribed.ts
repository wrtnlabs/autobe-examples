import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
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

export async function test_api_community_subscription_retrieve_not_subscribed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member A
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphabets(16),
    } satisfies IRedditLikeMember.IJoin,
  });
  // 2. Create a community (member A becomes the owner/subscribed)
  const community = await generate_random_reddit_like_member_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  // 3. Authenticate as member B (different member who did not subscribe)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphabets(16),
    } satisfies IRedditLikeMember.IJoin,
  });
  // 4. Member B checks subscription status for the community
  const subscription =
    await api.functional.redditLike.member.communities.subscription.at(
      memberBConnection,
      {
        communityId: community.id,
      },
    );
  // 5. Verify that the response is null (not subscribed)
  TestValidator.equals(
    "subscription should be null for non-subscribed member",
    subscription,
    null,
  );
}
