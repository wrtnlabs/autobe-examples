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

/**
 * Test advanced subscription search with date range filtering for both subscription creation and unsubscription events.
 */
export async function test_api_subscription_search_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // Test various date range filters with existing user subscriptions
  const now = new Date().toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const twoDaysAgo = new Date(
    Date.now() - 2 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // Test subscribed_from filter
  const subscribedFromResult =
    await api.functional.communityPlatform.user.subscriptions.search(
      userConnection,
      {
        body: {
          subscribed_from: oneDayAgo,
          status: "all" as const,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(subscribedFromResult);
  // Test subscribed_to filter
  const subscribedToResult =
    await api.functional.communityPlatform.user.subscriptions.search(
      userConnection,
      {
        body: {
          subscribed_to: oneDayAgo,
          status: "all" as const,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(subscribedToResult);
  // Test combined subscription date range
  const combinedSubscriptionRange =
    await api.functional.communityPlatform.user.subscriptions.search(
      userConnection,
      {
        body: {
          subscribed_from: twoDaysAgo,
          subscribed_to: now,
          status: "all" as const,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(combinedSubscriptionRange);
  // Test unsubscribed_from filter (for inactive subscriptions)
  const unsubscribedFromResult =
    await api.functional.communityPlatform.user.subscriptions.search(
      userConnection,
      {
        body: {
          unsubscribed_from: oneDayAgo,
          status: "inactive" as const,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(unsubscribedFromResult);
  // Test unsubscribed_to filter
  const unsubscribedToResult =
    await api.functional.communityPlatform.user.subscriptions.search(
      userConnection,
      {
        body: {
          unsubscribed_to: oneDayAgo,
          status: "inactive" as const,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(unsubscribedToResult);
  // Test combined unsubscription date range
  const combinedUnsubscriptionRange =
    await api.functional.communityPlatform.user.subscriptions.search(
      userConnection,
      {
        body: {
          unsubscribed_from: twoDaysAgo,
          unsubscribed_to: now,
          status: "inactive" as const,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(combinedUnsubscriptionRange);
  // Test empty result set with future date
  const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const emptyResult =
    await api.functional.communityPlatform.user.subscriptions.search(
      userConnection,
      {
        body: {
          subscribed_from: futureDate,
          status: "all" as const,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result for future date",
    emptyResult.data.length,
    0,
  );
  // Test boundary conditions with exact timestamps
  const boundaryTest =
    await api.functional.communityPlatform.user.subscriptions.search(
      userConnection,
      {
        body: {
          subscribed_from: twoDaysAgo,
          subscribed_to: now,
          unsubscribed_from: twoDaysAgo,
          unsubscribed_to: now,
          status: "all" as const,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(boundaryTest);
  // Test search functionality with text pattern
  const searchResult =
    await api.functional.communityPlatform.user.subscriptions.search(
      userConnection,
      {
        body: {
          search: "test",
          status: "all" as const,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(searchResult);
  // Test pagination with date range
  const paginatedResult =
    await api.functional.communityPlatform.user.subscriptions.search(
      userConnection,
      {
        body: {
          subscribed_from: twoDaysAgo,
          subscribed_to: now,
          page: 1,
          limit: 10,
          status: "all" as const,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(paginatedResult);
}
