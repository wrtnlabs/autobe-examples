import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunitySubscription";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_subscribe } from "../../../generate/generate_random_reddit_platform_member_communities_subscribe";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";

export async function test_api_subscriptions_list_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create 3 communities for member to subscribe to
  const community1 =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<3>>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community1);
  const community2 =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<3>>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community2);
  const community3 =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<3>>(),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community3);
  // 3. Subscribe member to the communities
  await generate_random_reddit_platform_member_communities_subscribe(
    memberConnection,
    {
      body: {
        confirmSubscription: true,
      } satisfies IRedditPlatformCommunitySubscription.ICreate,
      params: { communityId: community1.id },
    },
  );
  await generate_random_reddit_platform_member_communities_subscribe(
    memberConnection,
    {
      body: {
        confirmSubscription: true,
      } satisfies IRedditPlatformCommunitySubscription.ICreate,
      params: { communityId: community2.id },
    },
  );
  await generate_random_reddit_platform_member_communities_subscribe(
    memberConnection,
    {
      body: {
        confirmSubscription: true,
      } satisfies IRedditPlatformCommunitySubscription.ICreate,
      params: { communityId: community3.id },
    },
  );
  // 4. Call subscriptions list endpoint
  const subscriptions =
    await api.functional.redditPlatform.member.subscriptions.index(
      memberConnection,
      {
        body: {} satisfies IRedditPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(subscriptions);
  // 5. Validate response structure and content
  TestValidator.equals(
    "has 3 subscribed communities",
    subscriptions.data.length,
    3,
  );
  // Validate pagination metadata
  TestValidator.equals(
    "current page is 1",
    subscriptions.pagination.current,
    1,
  );
  TestValidator.equals("page limit is 20", subscriptions.pagination.limit, 20);
  TestValidator.equals(
    "total records is 3",
    subscriptions.pagination.records,
    3,
  );
  TestValidator.equals("total pages is 1", subscriptions.pagination.pages, 1);
  // Validate each subscription record
  for (const subscription of subscriptions.data) {
    typia.assert(subscription);
    // Verify subscription ID is valid UUID (validated by typia.assert already)
    typia.assert(subscription.id);
    // Verify subscribed_at timestamp is valid date-time
    typia.assert(subscription.subscribed_at);
    const subscribedAt = new Date(subscription.subscribed_at);
    TestValidator.predicate(
      "subscription has valid subscribed_at timestamp",
      () => !isNaN(subscribedAt.getTime()),
    );
    // Verify member summary includes required fields
    typia.assert(subscription.member);
    TestValidator.equals(
      "member has username",
      subscription.member.username.length > 0,
      true,
    );
    TestValidator.equals(
      "member has displayName",
      subscription.member.displayName.length > 0,
      true,
    );
    TestValidator.equals(
      "member has karma score",
      subscription.member.karmaScore >= 0,
      true,
    );
    TestValidator.equals(
      "member has subscriptionCount",
      subscription.member.subscriptionCount >= 0,
      true,
    );
    TestValidator.equals(
      "member has createdAt timestamp",
      new Date(subscription.member.createdAt).getTime() > 0,
      true,
    );
    // Verify community summary includes required fields
    typia.assert(subscription.community);
    TestValidator.equals(
      "community has name",
      subscription.community.name.length > 0,
      true,
    );
    TestValidator.equals(
      "community has subscriber count",
      subscription.community.subscriber_count >= 1,
      true,
    );
    TestValidator.equals(
      "community has author",
      subscription.community.author.username.length > 0,
      true,
    );
    TestValidator.equals(
      "community has createdAt timestamp",
      new Date(subscription.community.created_at).getTime() > 0,
      true,
    );
    // Validate community IDs match expected communities
    const expectedCommunityIds = [community1.id, community2.id, community3.id];
    TestValidator.predicate("community ID is valid", () =>
      expectedCommunityIds.includes(subscription.community.id),
    );
  }
  // 6. Verify sorting by subscribed_at DESC (most recent first)
  if (subscriptions.data.length >= 2) {
    TestValidator.predicate(
      "subscriptions sorted by subscribed_at DESC",
      () => {
        const times = subscriptions.data.map((sub) =>
          new Date(sub.subscribed_at).getTime(),
        );
        for (let i = 0; i < times.length - 1; i++) {
          if (times[i] < times[i + 1]) return false;
        }
        return true;
      },
    );
  }
  // 7. Verify each subscription record joins with community data correctly
  const firstSubscription = subscriptions.data[0];
  typia.assert(firstSubscription);
  // The member in subscription should match the authenticated member
  TestValidator.equals(
    "member ID matches authenticated member",
    firstSubscription.member.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "username matches authenticated member",
    firstSubscription.member.username,
    memberAuth.username,
  );
}
