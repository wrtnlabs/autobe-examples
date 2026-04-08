import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformSubscription";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_subscriptions_create } from "../../../generate/generate_random_reddit_platform_member_subscriptions_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_subscription } from "../../../prepare/prepare_random_reddit_platform_subscription";

export async function test_api_community_subscribers_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create test community
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name() + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const community =
    await api.functional.redditPlatform.member.communities.create(
      adminConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<3> & tags.MaxLength<50>>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 2. Create first member and subscribe
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name() + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const subscription1 =
    await api.functional.redditPlatform.member.subscriptions.create(
      member1Connection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription1);
  // Wait to ensure different subscription timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 3. Create second member and subscribe
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name() + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const subscription2 =
    await api.functional.redditPlatform.member.subscriptions.create(
      member2Connection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription2);
  // Wait to ensure different subscription timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 4. Create third member and subscribe
  const member3Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name() + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const subscription3 =
    await api.functional.redditPlatform.member.subscriptions.create(
      member3Connection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription3);
  // 5. View subscribers (public endpoint, no auth required)
  const subscribersResponse =
    await api.functional.redditPlatform.communities.subscribers.index(
      connection,
      {
        name: community.name,
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformSubscription.IRequest,
      },
    );
  typia.assert(subscribersResponse);
  // 6. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    subscribersResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    subscribersResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination total records",
    subscribersResponse.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination total pages",
    subscribersResponse.pagination.pages,
    1,
  );
  // 7. Validate subscriber count matches
  TestValidator.equals(
    "subscriber count matches",
    subscribersResponse.data.length,
    3,
  );
  // 8. Validate sorting order (subscribed_at descending - newest first)
  const sorted = ArrayUtil.repeat(
    3,
    (i) => subscribersResponse.data[i]?.subscribed_at,
  );
  const hasSubscribedAt = sorted.every((t) => t !== undefined);
  const isDescending = hasSubscribedAt
    ? sorted[0] >= sorted[1] && sorted[1] >= sorted[2] && sorted[0] >= sorted[2]
    : true; // Skip validation if no subscribed_at data
  TestValidator.predicate(
    "subscribers sorted by subscribed_at descending",
    isDescending,
  );
  // 9. Validate each subscriber entry structure
  for (let i = 0; i < subscribersResponse.data.length; i++) {
    const subscriber = subscribersResponse.data[i];
    typia.assert(subscriber);
    // Validate required fields
    TestValidator.equals(
      "subscriber has id",
      subscriber.id !== undefined,
      true,
    );
    TestValidator.equals(
      "subscriber has community",
      subscriber.community !== undefined,
      true,
    );
    TestValidator.equals(
      "subscriber has created_at",
      subscriber.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      "subscriber has deleted_at null",
      subscriber.deleted_at === null,
      true,
    );
    // Validate community reference
    TestValidator.equals(
      "community id matches",
      subscriber.community.id,
      community.id,
    );
    TestValidator.equals(
      "community name matches",
      subscriber.community.name,
      community.name,
    );
    TestValidator.equals(
      "community has owner",
      subscriber.community.owner !== undefined,
      true,
    );
  }
  // 10. Test pagination with limit parameter
  const subscribersResponse2 =
    await api.functional.redditPlatform.communities.subscribers.index(
      connection,
      {
        name: community.name,
        body: {
          page: 1,
          limit: 2,
        } satisfies IRedditPlatformSubscription.IRequest,
      },
    );
  typia.assert(subscribersResponse2);
  TestValidator.equals(
    "pagination with limit=2 returns 2",
    subscribersResponse2.data.length,
    2,
  );
  TestValidator.equals(
    "pagination records is 3",
    subscribersResponse2.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination pages is 2",
    subscribersResponse2.pagination.pages,
    2,
  );
  // 11. Test pagination with page parameter
  const subscribersResponse3 =
    await api.functional.redditPlatform.communities.subscribers.index(
      connection,
      {
        name: community.name,
        body: {
          page: 2,
          limit: 2,
        } satisfies IRedditPlatformSubscription.IRequest,
      },
    );
  typia.assert(subscribersResponse3);
  TestValidator.equals(
    "page 2 returns correct offset",
    subscribersResponse3.data.length,
    1,
  );
  TestValidator.equals(
    "page 2 pagination current",
    subscribersResponse3.pagination.current,
    2,
  );
}
