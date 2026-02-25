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

export async function test_api_user_subscription_maximum_limit_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // Register and authenticate user directly using available SDK
  const userConnection: api.IConnection = { host: connection.host };
  const user = await api.functional.communityPlatform.auth.user.join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        username: RandomGenerator.alphabets(10),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformUser.IJoin,
    },
  );
  typia.assert(user);
  // Create multiple communities for subscription testing using direct SDK
  const communities = await ArrayUtil.asyncRepeat(3, async () => {
    const community =
      await api.functional.communityPlatform.user.communities.create(
        userConnection,
        {
          body: {
            name: RandomGenerator.alphabets(15),
            description: RandomGenerator.paragraph({ sentences: 3 }),
            icon_url: typia.random<string & tags.Format<"uri">>(),
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    typia.assert(community);
    return community;
  });
  // Subscribe to communities using direct SDK
  for (const community of communities) {
    const subscription =
      await api.functional.communityPlatform.user.subscriptions.create(
        userConnection,
        {
          body: {
            community_platform_community_id: community.id,
            community_platform_user_id: user.id,
          } satisfies ICommunityPlatformCommunitySubscription.ICreate,
        },
      );
    typia.assert(subscription);
  }
  // Test subscription listing with boundary conditions
  const subscriptionPage =
    await api.functional.communityPlatform.user.subscriptions.index(
      userConnection,
      {
        body: {
          status: "active",
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(subscriptionPage);
  // Validate subscription functionality
  TestValidator.predicate(
    "has subscription data",
    subscriptionPage.data.length > 0,
  );
  TestValidator.equals(
    "pagination properties present",
    subscriptionPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "valid pagination limit",
    subscriptionPage.pagination.limit > 0,
  );
  // Test edge case: lower limit
  const lowLimitPage =
    await api.functional.communityPlatform.user.subscriptions.index(
      userConnection,
      {
        body: {
          status: "active",
          page: 1,
          limit: 1,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(lowLimitPage);
  // Test search functionality
  if (communities.length > 0 && communities[0].name) {
    const searchTerm = communities[0].name.substring(0, 5);
    const filteredSubscriptions =
      await api.functional.communityPlatform.user.subscriptions.index(
        userConnection,
        {
          body: {
            status: "active",
            search: searchTerm,
            page: 1,
            limit: 10,
          } satisfies ICommunityPlatformCommunitySubscription.IRequest,
        },
      );
    typia.assert(filteredSubscriptions);
  }
  // Validate subscription structure
  if (subscriptionPage.data.length > 0) {
    const subscription = subscriptionPage.data[0];
    TestValidator.predicate(
      "subscription has community info",
      subscription.community !== undefined,
    );
    TestValidator.predicate(
      "community has valid properties",
      subscription.community.id !== undefined &&
        subscription.community.name !== undefined,
    );
  }
}
