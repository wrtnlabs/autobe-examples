import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeSubscription";
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
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";

export async function test_api_member_subscriptions_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join member1
  const member1Connection: api.IConnection = { host: connection.host };
  const member1: IRedditLikeMember.IAuthorized = await authorize_member_join(
    member1Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
        displayName: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        avatarUrl: RandomGenerator.pick([
          null,
          "https://example.com/avatar1.png",
        ]),
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(member1);
  // 2. Create community A and automatically subscribe (creator auto-subscribes)
  const communityA = await api.functional.redditLike.member.communities.create(
    member1Connection,
    {
      body: {
        name: RandomGenerator.alphabets(8),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(communityA);
  // 3. Create community B and automatically subscribe
  const communityB = await api.functional.redditLike.member.communities.create(
    member1Connection,
    {
      body: {
        name: RandomGenerator.alphabets(8),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(communityB);
  // 4. Test filtering subscriptions with status 'subscribed'
  const subscribedResponse =
    await api.functional.redditLike.member.subscriptions.index(
      member1Connection,
      {
        body: {
          status: "subscribed",
        } satisfies IRedditLikeSubscription.IRequest,
      },
    );
  typia.assert(subscribedResponse);
  // Validate subscribed response - both communities should be subscribed
  TestValidator.equals(
    "only subscribed subscriptions returned",
    subscribedResponse.data.length,
    2,
  );
  // Validate all returned subscriptions have 'subscribed' status
  TestValidator.predicate(
    "all subscriptions have subscribed status",
    subscribedResponse.data.every(
      (sub: IRedditLikeSubscription.ISummary) => sub.status === "subscribed",
    ),
  );
  // Validate both community subscriptions exist using ArrayUtil.has
  TestValidator.predicate(
    "community A subscription exists",
    ArrayUtil.has(
      subscribedResponse.data,
      (sub: IRedditLikeSubscription.ISummary) =>
        sub.community.name === communityA.name,
    ),
  );
  TestValidator.predicate(
    "community B subscription exists",
    ArrayUtil.has(
      subscribedResponse.data,
      (sub: IRedditLikeSubscription.ISummary) =>
        sub.community.name === communityB.name,
    ),
  );
  // 5. Test filtering subscriptions with status 'unsubscribed'
  const unsubscribedResponse =
    await api.functional.redditLike.member.subscriptions.index(
      member1Connection,
      {
        body: {
          status: "unsubscribed",
        } satisfies IRedditLikeSubscription.IRequest,
      },
    );
  typia.assert(unsubscribedResponse);
  // Validate unsubscribed response - should be empty since nothing has been unsubscribed yet
  TestValidator.equals(
    "no unsubscribed subscriptions",
    unsubscribedResponse.data.length,
    0,
  );
  // 6. Test no filter (should return all subscriptions)
  const allResponse =
    await api.functional.redditLike.member.subscriptions.index(
      member1Connection,
      {
        body: {} as IRedditLikeSubscription.IRequest,
      },
    );
  typia.assert(allResponse);
  // Validate all subscriptions
  TestValidator.equals(
    "all subscriptions returned",
    allResponse.data.length,
    2,
  );
}
