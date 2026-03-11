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

export async function test_api_member_subscriptions_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connections
  const member1Connection: api.IConnection = { host: connection.host };
  const member2Connection: api.IConnection = { host: connection.host };
  // 2. Register and login member1
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(member1);
  // 3. Register and login member2
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(member2);
  // 4. Create community A
  const communityA = await api.functional.redditLike.member.communities.create(
    member1Connection,
    {
      body: {
        name: RandomGenerator.alphabets(6),
        icon_url: "https://example.com/icon-a.png",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(communityA);
  // 5. Create community B
  const communityB = await api.functional.redditLike.member.communities.create(
    member1Connection,
    {
      body: {
        name: RandomGenerator.alphabets(6),
        icon_url: "https://example.com/icon-b.png",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(communityB);
  // 6. Create community C for member2 (member1 should not see this)
  const communityC = await api.functional.redditLike.member.communities.create(
    member2Connection,
    {
      body: {
        name: RandomGenerator.alphabets(6),
        icon_url: "https://example.com/icon-c.png",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(communityC);
  // 7. Member1 subscribes to community A
  const subA = await api.functional.redditLike.member.subscriptions.index(
    member1Connection,
    {
      body: {
        status: "subscribed",
        communityName: communityA.name,
        limit: 1,
      } satisfies IRedditLikeSubscription.IRequest,
    },
  );
  typia.assert(subA);
  // 8. Member1 subscribes to community B
  const subB = await api.functional.redditLike.member.subscriptions.index(
    member1Connection,
    {
      body: {
        status: "subscribed",
        communityName: communityB.name,
        limit: 1,
      } satisfies IRedditLikeSubscription.IRequest,
    },
  );
  typia.assert(subB);
  // 9. Member1 subscribes to community C
  const subC = await api.functional.redditLike.member.subscriptions.index(
    member1Connection,
    {
      body: {
        status: "subscribed",
        communityName: communityC.name,
        limit: 1,
      } satisfies IRedditLikeSubscription.IRequest,
    },
  );
  typia.assert(subC);
  // 10. Test member1 retrieves their subscriptions
  const result = await api.functional.redditLike.member.subscriptions.index(
    member1Connection,
    {
      body: {
        limit: 10,
        offset: 0,
        sort: "desc",
      } satisfies IRedditLikeSubscription.IRequest,
    },
  );
  typia.assert(result);
  // 11. Validate subscriptions
  TestValidator.equals("subscriptions count", result.data.length, 3);
  TestValidator.equals("pagination records", result.pagination.records, 3);
  // 12. Validate community summaries
  const communityNames = result.data.map((s) => s.community.name);
  TestValidator.predicate(
    "community A exists",
    communityNames.includes(communityA.name),
  );
  TestValidator.predicate(
    "community B exists",
    communityNames.includes(communityB.name),
  );
  TestValidator.predicate(
    "community C exists",
    communityNames.includes(communityC.name),
  );
  // 13. Validate subscriber counts
  result.data.forEach((sub) => {
    TestValidator.predicate(
      "subscriber count valid",
      sub.community.subscriber_count >= 0,
    );
  });
  // 14. Test member2 retrieves their own subscriptions
  const member2Result =
    await api.functional.redditLike.member.subscriptions.index(
      member2Connection,
      {
        body: {
          limit: 10,
          offset: 0,
          sort: "desc",
        } satisfies IRedditLikeSubscription.IRequest,
      },
    );
  typia.assert(member2Result);
  // 15. Validate member2 only sees their own subscription
  TestValidator.equals(
    "member2 subscriptions count",
    member2Result.data.length,
    1,
  );
  TestValidator.equals(
    "member2 community",
    member2Result.data[0].community.name,
    communityC.name,
  );
}
