import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeSubscription";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_subscription_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAccount = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  memberConnection.headers = {
    Authorization: `Bearer ${memberAccount.token.access}`,
  };
  // Setup: Subscribe to 25 communities for pagination testing
  const communityNames: string[] = [];
  for (let i = 0; i < 25; i++) {
    const communityName = `test-community-${RandomGenerator.alphaNumeric(6)}`;
    communityNames.push(communityName);
    await api.functional.redditLike.member.communities.subscribe.create(
      memberConnection,
      {
        communityName: communityName,
      },
    );
  }
  // Test 1: Page 1 with limit=10
  const page1Result =
    await api.functional.redditLike.member.subscriptions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditLikeSubscription.IRequest,
      },
    );
  typia.assert(page1Result);
  TestValidator.equals(
    "page 1 pagination - current page",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 pagination - limit",
    page1Result.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page 1 pagination - total records",
    page1Result.pagination.records,
    25,
  );
  TestValidator.equals(
    "page 1 pagination - total pages",
    page1Result.pagination.pages,
    3,
  );
  TestValidator.equals("page 1 data - item count", page1Result.data.length, 10);
  // Test 2: Page 2 with limit=10
  const page2Result =
    await api.functional.redditLike.member.subscriptions.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IRedditLikeSubscription.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals(
    "page 2 pagination - current page",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals("page 2 data - item count", page2Result.data.length, 10);
  // Verify no duplicate community IDs between pages
  const page1CommunityIds = page1Result.data.map((item) => item.community.id);
  const page2CommunityIds = page2Result.data.map((item) => item.community.id);
  const hasDuplicates = page1CommunityIds.some((id) =>
    page2CommunityIds.includes(id),
  );
  TestValidator.equals(
    "no duplicate communities between page 1 and 2",
    hasDuplicates,
    false,
  );
  // Test 3: Page 3 with limit=10 (last page - should have 5 items)
  const page3Result =
    await api.functional.redditLike.member.subscriptions.index(
      memberConnection,
      {
        body: {
          page: 3,
          limit: 10,
        } satisfies IRedditLikeSubscription.IRequest,
      },
    );
  typia.assert(page3Result);
  TestValidator.equals(
    "page 3 pagination - current page",
    page3Result.pagination.current,
    3,
  );
  TestValidator.equals(
    "page 3 pagination - total pages",
    page3Result.pagination.pages,
    3,
  );
  TestValidator.equals(
    "page 3 data - remaining items count",
    page3Result.data.length,
    5,
  );
  // Verify last page items don't appear in first two pages
  const page3CommunityIds = page3Result.data.map((item) => item.community.id);
  const page3InPage1 = page3CommunityIds.some((id) =>
    page1CommunityIds.includes(id),
  );
  const page3InPage2 = page3CommunityIds.some((id) =>
    page2CommunityIds.includes(id),
  );
  TestValidator.equals(
    "no duplicates in last page",
    page3InPage1 || page3InPage2,
    false,
  );
  // Test 4: Page 1 with limit=100 (all items in one page)
  const allItemsResult =
    await api.functional.redditLike.member.subscriptions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IRedditLikeSubscription.IRequest,
      },
    );
  typia.assert(allItemsResult);
  TestValidator.equals(
    "all items pagination - current page",
    allItemsResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "all items pagination - limit",
    allItemsResult.pagination.limit,
    100,
  );
  TestValidator.equals(
    "all items pagination - total records",
    allItemsResult.pagination.records,
    25,
  );
  TestValidator.equals(
    "all items pagination - total pages (should be 1)",
    allItemsResult.pagination.pages,
    1,
  );
  TestValidator.equals(
    "all items data - should contain all 25 subscriptions",
    allItemsResult.data.length,
    25,
  );
  // Verify all items match the subscriptions created
  const allCommunityIds = allItemsResult.data.map((item) => item.community.id);
  const allNames = allItemsResult.data.map((item) => item.community.name);
  const allCreated = communityNames.every((name) => allNames.includes(name));
  TestValidator.equals(
    "all subscriptions match created communities",
    allCreated,
    true,
  );
  // Test 5: Edge case - page=0 should default to page=1
  const zeroPageResult =
    await api.functional.redditLike.member.subscriptions.index(
      memberConnection,
      {
        body: {
          page: 0,
          limit: 10,
        } satisfies IRedditLikeSubscription.IRequest,
      },
    );
  typia.assert(zeroPageResult);
  TestValidator.equals(
    "zero page - should default to page 1",
    zeroPageResult.pagination.current,
    1,
  );
  // Test 6: Edge case - limit=101 should cap at 100
  const largeLimitResult =
    await api.functional.redditLike.member.subscriptions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 101,
        } satisfies IRedditLikeSubscription.IRequest,
      },
    );
  typia.assert(largeLimitResult);
  TestValidator.equals(
    "large limit - should cap at 100",
    largeLimitResult.pagination.limit,
    100,
  );
  TestValidator.equals(
    "large limit - should still return all 25 records",
    largeLimitResult.pagination.records,
    25,
  );
}
