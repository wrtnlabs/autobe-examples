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

export async function test_api_member_duplicate_subscription_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member session
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(8),
    password: "12345678",
    display_name: RandomGenerator.name(),
    bio: null,
    avatar_url: null,
  } satisfies IRedditLikeMember.IJoin;
  const member = await authorize_member_join(memberConnection, {
    body: memberData,
  });
  typia.assert(member);
  // 2. Get available community for testing
  const communities = await api.functional.redditLike.communities.index(
    memberConnection,
    {
      body: {
        search: undefined,
        sort: "subscribers",
        subscriptionStatus: "all",
        page: 1,
        limit: 10,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(communities);
  // Skip test if no community exists
  if (communities.data.length === 0) {
    return;
  }
  const targetCommunity = communities.data[0];
  // 3. Perform initial subscription
  const initialSubscription =
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
  typia.assert(initialSubscription);
  TestValidator.equals(
    "initial subscription status is subscribed",
    initialSubscription.status,
    "subscribed",
  );
  // 4. Attempt duplicate subscription - should fail
  await TestValidator.error(
    "duplicate subscription should be rejected",
    async () => {
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
    },
  );
  // 5. Verify original subscription record unchanged
  const getSubscriptions =
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
  typia.assert(getSubscriptions);
  TestValidator.equals(
    "subscription unchanged after duplicate attempt",
    getSubscriptions.id,
    initialSubscription.id,
  );
  TestValidator.equals(
    "status remains subscribed after duplicate attempt",
    getSubscriptions.status,
    "subscribed",
  );
}
