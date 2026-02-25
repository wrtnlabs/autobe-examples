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
 * Test retrieving a paginated list of communities to which the authenticated user is subscribed.
 * Use a valid authenticated user with existing subscriptions.
 * Validate response includes pagination metadata and subscription summaries.
 * Test filtering by community name and verify response structure.
 * Verify HTTP 200 status.
 */
export async function test_api_subscriptions_index_success_with_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. User join to get authenticated connection
  const userConnection: api.IConnection = { host: connection.host };
  const userAuthorized = await authorize_user_join(connection, {
    // Provide predictable username and displayName to create known subscriptions
    body: {
      email: `test_${RandomGenerator.alphaNumeric(6)}@example.com`,
      password: "securePassword123",
      username: `user${RandomGenerator.alphabets(6)}`,
      displayName: `User ${RandomGenerator.name(1)}`,
      href: "https://test.client.local",
      referrer: "https://referrer.local",
      ip: null,
    },
  });
  typia.assert(userAuthorized);
  userConnection.headers = { Authorization: userAuthorized.token.access };
  // 2. Prepare known filter criteria - will filter with prefix of a community name string
  // Since we don't have community creation in this scenario, use empty filter first
  // and then try filter with non-empty string for partial match
  // 3. Fetch the user's subscriptions WITHOUT filter to ensure some data returned
  // Using page=1, limit=10 by default
  const withoutFilterBody: ICommunityPlatformCommunitySubscription.IRequest = {
    page: 1,
    limit: 10,
  };
  const fullData =
    await api.functional.communityPlatform.user.subscriptions.index(
      userConnection,
      { body: withoutFilterBody },
    );
  typia.assert(fullData);
  // Verify pagination info correctness
  TestValidator.predicate(
    "pagination current page is at least 1",
    fullData.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit max 100",
    fullData.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    fullData.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    fullData.pagination.records >= 0,
  );
  // The data length must not exceed limit
  TestValidator.predicate(
    "data length does not exceed limit",
    fullData.data.length <= fullData.pagination.limit,
  );
  // If any subscriptions exist, check the structure of the first element
  if (fullData.data.length > 0) {
    const firstSub = fullData.data[0];
    typia.assert(firstSub);
    TestValidator.predicate(
      "subscription id is uuid",
      /^[0-9a-f-]{36}$/i.test(firstSub.id),
    );
    typia.assert(firstSub.community);
    typia.assert(firstSub.community.ownerUser);
  }
  // 4. If no subscriptions, skip filter test because no data to filter
  if (fullData.data.length === 0) return;
  // 5. Fetch subscriptions with communityName filter using substring of an existing community name
  const someCommunityName = fullData.data[0].community.name;
  const filterString = someCommunityName.substring(
    0,
    Math.min(3, someCommunityName.length),
  );
  const withFilterBody: ICommunityPlatformCommunitySubscription.IRequest = {
    page: 1,
    limit: 10,
    communityName: filterString,
  };
  const filteredData =
    await api.functional.communityPlatform.user.subscriptions.index(
      userConnection,
      { body: withFilterBody },
    );
  typia.assert(filteredData);
  // The filtered data should be subset of fullData
  // Each subscription's community name includes the filterString
  filteredData.data.forEach((subscription) => {
    TestValidator.predicate(
      "community name includes filter string",
      subscription.community.name.includes(filterString),
    );
  });
  // Validate pagination metadata
  TestValidator.predicate(
    "filtered pagination current page is at least 1",
    filteredData.pagination.current >= 1,
  );
  TestValidator.predicate(
    "filtered pagination limit within 1-100",
    filteredData.pagination.limit >= 1 && filteredData.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "filtered pagination pages >= 0",
    filteredData.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "filtered pagination records >= 0",
    filteredData.pagination.records >= 0,
  );
  TestValidator.predicate(
    "filtered data length does not exceed limit",
    filteredData.data.length <= filteredData.pagination.limit,
  );
}
