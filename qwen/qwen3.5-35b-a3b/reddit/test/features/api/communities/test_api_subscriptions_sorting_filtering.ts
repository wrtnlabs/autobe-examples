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

export async function test_api_subscriptions_sorting_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
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
    },
  });
  const authToken: api.IConnection = {
    host: connection.host,
    headers: { Authorization: member.token.access },
  };
  // 2. Create 5 communities with distinct names
  const communities = await ArrayUtil.asyncRepeat(5, async (index: number) => {
    const communityResult =
      await api.functional.redditPlatform.member.communities.create(authToken, {
        body: {
          name: typia.random<string & tags.MinLength<1> & tags.MaxLength<50>>(),
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      });
    typia.assertGuard(communityResult);
    return communityResult;
  });
  typia.assertGuard(communities);
  // 3. Subscribe to communities sequentially (to create different subscribed_at timestamps)
  const subscriptions = await ArrayUtil.asyncRepeat(
    5,
    async (index: number) => {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, index * 100);
      });
      const subscriptionResult =
        await api.functional.redditPlatform.member.communities.subscribe(
          authToken,
          {
            communityId: communities[index].id,
            body: {
              confirmSubscription: true,
            } satisfies IRedditPlatformCommunitySubscription.ICreate,
          },
        );
      typia.assertGuard(subscriptionResult);
      return subscriptionResult;
    },
  );
  typia.assertGuard(subscriptions);
  // 4. Test SUBSCRIBED_AT DESC (default) - most recent first
  {
    const result =
      await api.functional.redditPlatform.member.subscriptions.index(
        authToken,
        {
          body: {
            sortBy: "SUBSCRIBED_AT",
            sortOrder: "DESC",
            limit: 5,
          } satisfies IRedditPlatformCommunitySubscription.IRequest,
        },
      );
    typia.assertGuard(result);
    TestValidator.equals(
      "SUBSCRIBED_AT DESC - first item should be most recent",
      result.data[0].community.id,
      subscriptions[4].community.id,
    );
    TestValidator.equals(
      "SUBSCRIBED_AT DESC - last item should be oldest",
      result.data[result.data.length - 1].community.id,
      subscriptions[0].community.id,
    );
  }
  // 5. Test SUBSCRIBED_AT ASC - oldest first
  {
    const result =
      await api.functional.redditPlatform.member.subscriptions.index(
        authToken,
        {
          body: {
            sortBy: "SUBSCRIBED_AT",
            sortOrder: "ASC",
            limit: 5,
          } satisfies IRedditPlatformCommunitySubscription.IRequest,
        },
      );
    typia.assertGuard(result);
    TestValidator.equals(
      "SUBSCRIBED_AT ASC - first item should be oldest",
      result.data[0].community.id,
      subscriptions[0].community.id,
    );
    TestValidator.equals(
      "SUBSCRIBED_AT ASC - last item should be most recent",
      result.data[result.data.length - 1].community.id,
      subscriptions[4].community.id,
    );
  }
  // 6. Test COMMUNITY_NAME ASC - alphabetical
  {
    const result =
      await api.functional.redditPlatform.member.subscriptions.index(
        authToken,
        {
          body: {
            sortBy: "COMMUNITY_NAME",
            sortOrder: "ASC",
            limit: 5,
          } satisfies IRedditPlatformCommunitySubscription.IRequest,
        },
      );
    typia.assertGuard(result);
    for (let i = 1; i < result.data.length; i++) {
      const prevName = result.data[i - 1].community.name;
      const currName = result.data[i].community.name;
      TestValidator.predicate(
        `COMMUNITY_NAME ASC - item ${i} should be after item ${i - 1}`,
        currName.localeCompare(prevName) >= 0,
      );
    }
  }
  // 7. Test COMMUNITY_NAME DESC - reverse alphabetical
  {
    const result =
      await api.functional.redditPlatform.member.subscriptions.index(
        authToken,
        {
          body: {
            sortBy: "COMMUNITY_NAME",
            sortOrder: "DESC",
            limit: 5,
          } satisfies IRedditPlatformCommunitySubscription.IRequest,
        },
      );
    typia.assertGuard(result);
    for (let i = 1; i < result.data.length; i++) {
      const prevName = result.data[i - 1].community.name;
      const currName = result.data[i].community.name;
      TestValidator.predicate(
        `COMMUNITY_NAME DESC - item ${i} should be before item ${i - 1}`,
        currName.localeCompare(prevName) <= 0,
      );
    }
  }
  // 8. Test SUBSCRIBER_COUNT DESC
  {
    const result =
      await api.functional.redditPlatform.member.subscriptions.index(
        authToken,
        {
          body: {
            sortBy: "SUBSCRIBER_COUNT",
            sortOrder: "DESC",
            limit: 5,
          } satisfies IRedditPlatformCommunitySubscription.IRequest,
        },
      );
    typia.assertGuard(result);
    for (let i = 1; i < result.data.length; i++) {
      const prevCount = result.data[i - 1].community.subscriber_count;
      const currCount = result.data[i].community.subscriber_count;
      TestValidator.predicate(
        `SUBSCRIBER_COUNT DESC - item ${i} count should be <= item ${i - 1} count`,
        currCount <= prevCount,
      );
    }
  }
  // 9. Test communityNameSearch filter
  {
    const searchTerm = communities[0].name.substring(
      0,
      Math.ceil(communities[0].name.length / 2),
    );
    const result =
      await api.functional.redditPlatform.member.subscriptions.index(
        authToken,
        {
          body: {
            communityNameSearch: searchTerm,
            limit: 5,
          } satisfies IRedditPlatformCommunitySubscription.IRequest,
        },
      );
    typia.assertGuard(result);
    for (const subscription of result.data) {
      TestValidator.predicate(
        "communityNameSearch - should match case-insensitive substring",
        subscription.community.name
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
      );
    }
  }
  // 10. Test pagination with limit=2
  {
    const result =
      await api.functional.redditPlatform.member.subscriptions.index(
        authToken,
        {
          body: {
            limit: 2,
          } satisfies IRedditPlatformCommunitySubscription.IRequest,
        },
      );
    typia.assertGuard(result);
    TestValidator.equals(
      "pagination limit=2 - should return max 2 items",
      result.data.length,
      2,
    );
    TestValidator.equals(
      "pagination current page",
      result.pagination.current,
      1,
    );
    TestValidator.equals("pagination limit", result.pagination.limit, 2);
    TestValidator.equals(
      "pagination total records",
      result.pagination.records,
      5,
    );
    TestValidator.equals("pagination total pages", result.pagination.pages, 3);
  }
}
