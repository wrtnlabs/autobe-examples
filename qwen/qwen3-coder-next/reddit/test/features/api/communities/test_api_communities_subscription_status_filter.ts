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

export async function test_api_communities_subscription_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create test member with authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: "123456",
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // Ensure communities exist by subscribing to some - these will be created on first subscription
  await api.functional.redditLike.member.communities.subscribe.create(
    memberConnection,
    {
      communityName: "test_community_filter_a",
    },
  );
  await api.functional.redditLike.member.communities.subscribe.create(
    memberConnection,
    {
      communityName: "test_community_filter_b",
    },
  );
  // Test 'subscribed' filter - should return only subscribed communities
  const subscribedResult = await api.functional.redditLike.communities.index(
    memberConnection,
    {
      body: {
        search: "",
        sort: "newest",
        subscriptionStatus: "subscribed",
        page: 1,
        limit: 100,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(subscribedResult);
  TestValidator.predicate(
    "subscribed filter returns subscribed communities only",
    () =>
      subscribedResult.data.every((c) =>
        c.name.includes("test_community_filter"),
      ),
  );
  // Test 'unsubscribed' filter - should return non-subscribed communities
  const unsubscribedResult = await api.functional.redditLike.communities.index(
    memberConnection,
    {
      body: {
        search: "",
        sort: "newest",
        subscriptionStatus: "unsubscribed",
        page: 1,
        limit: 100,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(unsubscribedResult);
  TestValidator.predicate(
    "unsubscribed filter excludes subscribed communities",
    () =>
      !unsubscribedResult.data.some((c) =>
        c.name.includes("test_community_filter"),
      ),
  );
  // Test 'all' filter - should return all communities
  const allResult = await api.functional.redditLike.communities.index(
    memberConnection,
    {
      body: {
        search: "",
        sort: "newest",
        subscriptionStatus: "all",
        page: 1,
        limit: 100,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(allResult);
  TestValidator.predicate(
    "all filter includes both subscribed and unsubscribed communities",
    () => allResult.data.length >= 2,
  );
}
