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

export async function test_api_subscription_search_basic_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection
  const userConnection: api.IConnection = { host: connection.host };
  // Register and authenticate user
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Test 1: Basic search with empty pattern
  const emptySearchResult =
    await api.functional.communityPlatform.user.subscriptions.search(
      userConnection,
      {
        body: {
          search: "",
          status: "all",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(emptySearchResult);
  TestValidator.equals(
    "empty search returns valid pagination structure",
    emptySearchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty search returns correct limit",
    emptySearchResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "empty search returns zero records",
    emptySearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search returns zero pages",
    emptySearchResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty search returns empty data array",
    emptySearchResult.data.length,
    0,
  );
  // Test 2: Search with pattern matching
  const patternSearchResult =
    await api.functional.communityPlatform.user.subscriptions.search(
      userConnection,
      {
        body: {
          search: "community",
          status: "all",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(patternSearchResult);
  TestValidator.equals(
    "pattern search returns correct page",
    patternSearchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pattern search returns correct limit",
    patternSearchResult.pagination.limit,
    5,
  );
  // Test 3: Filter by active subscriptions
  const activeSearchResult =
    await api.functional.communityPlatform.user.subscriptions.search(
      userConnection,
      {
        body: {
          status: "active",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(activeSearchResult);
  TestValidator.predicate(
    "active search returns valid pagination",
    activeSearchResult.pagination.limit === 10,
  );
  // Test 4: Filter by inactive subscriptions
  const inactiveSearchResult =
    await api.functional.communityPlatform.user.subscriptions.search(
      userConnection,
      {
        body: {
          status: "inactive",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(inactiveSearchResult);
  TestValidator.predicate(
    "inactive search returns valid structure",
    inactiveSearchResult.pagination.current === 1,
  );
  // Test 5: Test pagination with different parameters
  const paginationTestResult =
    await api.functional.communityPlatform.user.subscriptions.search(
      userConnection,
      {
        body: {
          status: "all",
          page: 2,
          limit: 3,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(paginationTestResult);
  TestValidator.equals(
    "pagination test has correct page",
    paginationTestResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination test has correct limit",
    paginationTestResult.pagination.limit,
    3,
  );
  // Test 6: Validate that search endpoint properly handles authenticated user context
  // Since we're using the authenticated userConnection, the search should only return
  // subscriptions belonging to this user (which is zero in this case)
  TestValidator.equals(
    "search respects user authentication",
    paginationTestResult.data.length,
    0,
  );
  // Test 7: Test with maximum limit value
  const maxLimitResult =
    await api.functional.communityPlatform.user.subscriptions.search(
      userConnection,
      {
        body: {
          status: "all",
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(maxLimitResult);
  TestValidator.equals(
    "max limit returns correct limit",
    maxLimitResult.pagination.limit,
    100,
  );
}
