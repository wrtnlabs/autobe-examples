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

export async function test_api_subscription_search_comprehensive_workflow(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection
  const userConnection: api.IConnection = { host: connection.host };
  // Register and authenticate user
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
  // Note: This test focuses on subscription search functionality validation
  // Since we don't have community creation or subscription management APIs,
  // we test the search endpoint with various filter combinations on empty data
  // This validates the API contract and error handling
  // Test 1: Basic search with empty criteria
  const emptySearch =
    await api.functional.communityPlatform.user.subscriptions.search(
      userConnection,
      {
        body: {
          status: "all",
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.equals(
    "initial empty search records",
    emptySearch.data.length,
    0,
  );
  TestValidator.equals(
    "total records count",
    emptySearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "current page number",
    emptySearch.pagination.current,
    1,
  );
  TestValidator.equals("page limit size", emptySearch.pagination.limit, 10);
  TestValidator.equals(
    "total pages calculation",
    emptySearch.pagination.pages,
    0,
  );
  // Test 2: Status filtering variations
  const activeSearch =
    await api.functional.communityPlatform.user.subscriptions.search(
      userConnection,
      {
        body: {
          status: "active",
          limit: 5,
          page: 1,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(activeSearch);
  TestValidator.equals(
    "active status search empty",
    activeSearch.data.length,
    0,
  );
  const inactiveSearch =
    await api.functional.communityPlatform.user.subscriptions.search(
      userConnection,
      {
        body: {
          status: "inactive",
          limit: 5,
          page: 1,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(inactiveSearch);
  TestValidator.equals(
    "inactive status search empty",
    inactiveSearch.data.length,
    0,
  );
  // Test 3: Text search functionality
  const textSearch =
    await api.functional.communityPlatform.user.subscriptions.search(
      userConnection,
      {
        body: {
          search: "technology",
          status: "all",
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(textSearch);
  TestValidator.equals("text pattern search empty", textSearch.data.length, 0);
  // Test 4: Date range filtering
  const dateSearch =
    await api.functional.communityPlatform.user.subscriptions.search(
      userConnection,
      {
        body: {
          subscribed_from: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          subscribed_to: new Date().toISOString(),
          status: "all",
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(dateSearch);
  TestValidator.equals("date range search empty", dateSearch.data.length, 0);
  // Test 5: Pagination functionality
  const paginationTest =
    await api.functional.communityPlatform.user.subscriptions.search(
      userConnection,
      {
        body: {
          page: 2,
          limit: 5,
          status: "all",
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(paginationTest);
  TestValidator.equals(
    "page navigation empty results",
    paginationTest.data.length,
    0,
  );
  TestValidator.equals(
    "page navigation current page",
    paginationTest.pagination.current,
    2,
  );
  // Test 6: Limit boundary testing
  const maxLimitSearch =
    await api.functional.communityPlatform.user.subscriptions.search(
      userConnection,
      {
        body: {
          limit: 100,
          page: 1,
          status: "all",
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(maxLimitSearch);
  TestValidator.equals(
    "maximum limit search empty",
    maxLimitSearch.data.length,
    0,
  );
  const minLimitSearch =
    await api.functional.communityPlatform.user.subscriptions.search(
      userConnection,
      {
        body: {
          limit: 1,
          page: 1,
          status: "all",
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(minLimitSearch);
  TestValidator.equals(
    "minimum limit search empty",
    minLimitSearch.data.length,
    0,
  );
  // Test 7: Combined filter scenarios
  const combinedSearch =
    await api.functional.communityPlatform.user.subscriptions.search(
      userConnection,
      {
        body: {
          search: "programming",
          status: "active",
          subscribed_from: new Date(Date.now() - 604800000).toISOString(), // 1 week ago
          limit: 20,
          page: 1,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(combinedSearch);
  TestValidator.equals(
    "combined filter search empty",
    combinedSearch.data.length,
    0,
  );
  // Test 8: Performance with realistic parameters
  const performanceSearch =
    await api.functional.communityPlatform.user.subscriptions.search(
      userConnection,
      {
        body: {
          status: "all",
          limit: 50,
          page: 1,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(performanceSearch);
  TestValidator.equals(
    "performance search empty",
    performanceSearch.data.length,
    0,
  );
  // Test 9: Unsubscription date filtering (should return empty since no subscriptions exist)
  const unsubscribedSearch =
    await api.functional.communityPlatform.user.subscriptions.search(
      userConnection,
      {
        body: {
          unsubscribed_from: new Date(Date.now() - 86400000).toISOString(),
          unsubscribed_to: new Date().toISOString(),
          status: "inactive",
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(unsubscribedSearch);
  TestValidator.equals(
    "unsubscription date search empty",
    unsubscribedSearch.data.length,
    0,
  );
}
