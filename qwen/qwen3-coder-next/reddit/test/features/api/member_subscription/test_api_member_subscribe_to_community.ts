import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_subscriptions_create } from "../../../generate/generate_random_reddit_like_member_subscriptions_create";
import { prepare_random_reddit_like_subscription } from "../../../prepare/prepare_random_reddit_like_subscription";

export async function test_api_member_subscribe_to_community(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.redditLike.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: "12345678",
        display_name: RandomGenerator.name(),
        bio: null,
        avatar_url: null,
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(member);
  // Get existing communities (no community creation endpoint available)
  const communityList = await api.functional.redditLike.communities.index(
    memberConnection,
    {
      body: {
        sort: "newest",
        page: 1,
        limit: 5,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(communityList);
  TestValidator.predicate(
    "has communities available",
    communityList.data.length > 0,
  );
  const targetCommunity = communityList.data[0];
  // Subscribe member to community
  const subscription =
    await api.functional.redditLike.member.subscriptions.create(
      memberConnection,
      {
        body: {
          reddit_like_member_id: member.id,
          reddit_like_community_id: targetCommunity.id,
          status: "subscribed",
        } satisfies IRedditLikeSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // Validate subscription
  TestValidator.equals("member ID matches", subscription.member.id, member.id);
  TestValidator.equals(
    "community ID matches",
    subscription.community.id,
    targetCommunity.id,
  );
  TestValidator.equals(
    "status is subscribed",
    subscription.status,
    "subscribed",
  );
}
