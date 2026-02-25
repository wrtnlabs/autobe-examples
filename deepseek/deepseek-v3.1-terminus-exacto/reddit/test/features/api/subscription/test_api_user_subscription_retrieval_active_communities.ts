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

/**
 * Test that authenticated users can retrieve their active community subscriptions with pagination.
 * Create multiple communities with different subscription statuses, then call the endpoint
 * with pagination parameters. Validate that only active subscriptions (unsubscribed_at IS NULL)
 * are returned with community details. Verify pagination metadata is correct.
 * Test filtering by community name search and subscription date ranges.
 */
export async function test_api_user_subscription_retrieval_active_communities(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // Create multiple communities using utility function
  const communities = await ArrayUtil.asyncRepeat(5, async (index) => {
    const community =
      await generate_random_community_platform_user_communities_create(
        userConnection,
        {
          body: {
            name: `community-${index}-${RandomGenerator.alphabets(6)}`,
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    typia.assert(community);
    return community;
  });
  // Subscribe to all communities using utility function
  const subscriptions = await ArrayUtil.asyncRepeat(
    communities.length,
    async (index) => {
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
    },
  );
  // Test pagination with default parameters
  const firstPage =
    await api.functional.communityPlatform.user.subscriptions.index(
      userConnection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(firstPage);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", firstPage.pagination.limit, 2);
  TestValidator.equals("total records", firstPage.pagination.records, 5);
  TestValidator.equals("total pages", firstPage.pagination.pages, 3);
  TestValidator.equals("data count matches limit", firstPage.data.length, 2);
  // Test second page
  const secondPage =
    await api.functional.communityPlatform.user.subscriptions.index(
      userConnection,
      {
        body: {
          page: 2,
          limit: 2,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "second page current page",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals("second page data count", secondPage.data.length, 2);
  // Test third page (should have 1 item)
  const thirdPage =
    await api.functional.communityPlatform.user.subscriptions.index(
      userConnection,
      {
        body: {
          page: 3,
          limit: 2,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(thirdPage);
  TestValidator.equals(
    "third page current page",
    thirdPage.pagination.current,
    3,
  );
  TestValidator.equals("third page data count", thirdPage.data.length, 1);
  // Test filtering by community name search
  const searchTerm = communities[0].name.substring(0, 5);
  const searchResults =
    await api.functional.communityPlatform.user.subscriptions.index(
      userConnection,
      {
        body: {
          search: searchTerm,
          status: "active",
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(searchResults);
  TestValidator.predicate(
    "search returns matching results",
    searchResults.data.length > 0,
  );
  TestValidator.predicate(
    "all results contain search term",
    searchResults.data.every((sub) =>
      sub.community.name.toLowerCase().includes(searchTerm.toLowerCase()),
    ),
  );
  // Test comprehensive date range filtering
  const now = new Date().toISOString();
  const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 1 day ago
  // Test subscribed_from filter
  const fromFilteredResults =
    await api.functional.communityPlatform.user.subscriptions.index(
      userConnection,
      {
        body: {
          subscribed_from: pastDate,
          status: "active",
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(fromFilteredResults);
  // Test subscribed_to filter
  const toFilteredResults =
    await api.functional.communityPlatform.user.subscriptions.index(
      userConnection,
      {
        body: {
          subscribed_to: now,
          status: "active",
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(toFilteredResults);
  // Test combined date range
  const rangeFilteredResults =
    await api.functional.communityPlatform.user.subscriptions.index(
      userConnection,
      {
        body: {
          subscribed_from: pastDate,
          subscribed_to: now,
          status: "active",
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(rangeFilteredResults);
  TestValidator.predicate(
    "date range filtered results exist",
    rangeFilteredResults.data.length > 0,
  );
  // Test status filtering with 'all' parameter
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
    5,
  );
  // Test error case with invalid pagination parameters
  await TestValidator.error("invalid page number should fail", async () => {
    await api.functional.communityPlatform.user.subscriptions.index(
      userConnection,
      {
        body: {
          page: 0,
          limit: 10,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  });
  // Test error case with invalid limit
  await TestValidator.error("invalid limit should fail", async () => {
    await api.functional.communityPlatform.user.subscriptions.index(
      userConnection,
      {
        body: {
          page: 1,
          limit: 200,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  });
}
