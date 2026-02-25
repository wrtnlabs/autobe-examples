import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_subscriptions_create } from "../../../generate/generate_random_community_platform_user_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";

export async function test_api_user_subscription_pagination_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection
  const userConnection: api.IConnection = { host: connection.host };
  // Register and authenticate user
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      username: RandomGenerator.alphabets(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Create multiple communities with different names
  const communities = await ArrayUtil.asyncRepeat(15, async (index) => {
    const community =
      await api.functional.communityPlatform.user.communities.create(
        userConnection,
        {
          body: {
            name: `community_${index}_${RandomGenerator.alphabets(5)}`,
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    typia.assert(community);
    return community;
  });
  // Subscribe to communities with varying dates
  const subscriptions = await ArrayUtil.asyncRepeat(15, async (index) => {
    const subscription =
      await generate_random_community_platform_user_subscriptions_create(
        userConnection,
        {
          body: {
            community_platform_community_id: communities[index].id,
          } satisfies ICommunityPlatformCommunitySubscription.ICreate,
        },
      );
    typia.assert(subscription);
    return subscription;
  });
  // Unsubscribe from some communities to create inactive subscriptions
  await ArrayUtil.asyncRepeat(5, async (index) => {
    await api.functional.communityPlatform.user.subscriptions.erase(
      userConnection,
      {
        subscriptionId: subscriptions[index].id,
      },
    );
  });
  // Test pagination with different page sizes
  const page1 = await api.functional.communityPlatform.user.subscriptions.index(
    userConnection,
    {
      body: {
        page: 1,
        limit: 5,
        status: "active",
      } satisfies ICommunityPlatformCommunitySubscription.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 has correct data count", page1.data.length, 5);
  TestValidator.equals("page 1 pagination info", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 5);
  const page2 = await api.functional.communityPlatform.user.subscriptions.index(
    userConnection,
    {
      body: {
        page: 2,
        limit: 5,
        status: "active",
      } satisfies ICommunityPlatformCommunitySubscription.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 has correct data count", page2.data.length, 5);
  TestValidator.equals("page 2 pagination info", page2.pagination.current, 2);
  // Test search functionality
  const searchResult =
    await api.functional.communityPlatform.user.subscriptions.index(
      userConnection,
      {
        body: {
          search: "community_1",
          status: "all",
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search returns matching results",
    searchResult.data.every((sub) =>
      sub.community.name.includes("community_1"),
    ),
  );
  // Test status filtering
  const activeSubscriptions =
    await api.functional.communityPlatform.user.subscriptions.index(
      userConnection,
      {
        body: {
          status: "active",
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(activeSubscriptions);
  TestValidator.equals(
    "active subscriptions count",
    activeSubscriptions.pagination.records,
    10,
  );
  const inactiveSubscriptions =
    await api.functional.communityPlatform.user.subscriptions.index(
      userConnection,
      {
        body: {
          status: "inactive",
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(inactiveSubscriptions);
  TestValidator.equals(
    "inactive subscriptions count",
    inactiveSubscriptions.pagination.records,
    5,
  );
  const allSubscriptions =
    await api.functional.communityPlatform.user.subscriptions.index(
      userConnection,
      {
        body: {
          status: "all",
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(allSubscriptions);
  TestValidator.equals(
    "all subscriptions count",
    allSubscriptions.pagination.records,
    15,
  );
  // Test combined filters
  const combinedResult =
    await api.functional.communityPlatform.user.subscriptions.index(
      userConnection,
      {
        body: {
          search: "community",
          status: "active",
          page: 1,
          limit: 3,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(combinedResult);
  TestValidator.equals(
    "combined filter page size",
    combinedResult.data.length,
    3,
  );
  TestValidator.predicate(
    "combined filter active status",
    combinedResult.data.every((sub) =>
      sub.community.name.includes("community"),
    ),
  );
}
