import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySubscription";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_member_subscriptions_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

/**
 * Test pagination and search functionality for the subscription list.
 *
 * Validates the complete subscription list retrieval flow including pagination controls, search filtering, and ordering consistency. Ensures that pagination parameters correctly control result set size, metadata accurately reflects total records, and search performs case-insensitive partial matching on community names.
 *
 * Special attention is given to verifying that the total records count matches actual subscriptions, pagination metadata (current, limit, records, pages) is mathematically correct, and ordering remains consistent (created_at DESC) across paginated results. Search functionality is tested with various query patterns including partial matches and case variations.
 *
 * 1. Member registers and authenticates using authorize_member_join utility.
 * 2. Creates 25 communities with distinct names exceeding default page limit.
 * 3. Subscribes to all 25 communities to establish test dataset.
 * 4. Tests default pagination (page 1, limit 20) returns exactly 20 items.
 * 5. Tests page 2 with limit 20 returns remaining 5 items with correct metadata.
 * 6. Tests custom limit (limit 10) verifies pagination metadata accuracy.
 * 7. Tests search functionality with partial community name matching.
 * 8. Validates case-insensitive search works correctly.
 * 9. Verifies ordering is consistent (created_at DESC) across all pages.
 * 10. Confirms total records count matches actual subscription count.
 */
export async function test_api_subscription_list_pagination_and_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create 25 communities with distinct names for pagination testing
  const communityNames = ArrayUtil.repeat(25, (index) => ({
    name: `TestCommunity${index.toString().padStart(2, "0")}_${RandomGenerator.alphabets(5)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    icon: typia.random<string & tags.Format<"uri">>(),
  }));
  const communities: IRedditCommunityCommunity[] = [];
  for (const communityData of communityNames) {
    const community =
      await generate_random_reddit_community_member_communities_create(
        memberConnection,
        { body: communityData satisfies IRedditCommunityCommunity.ICreate },
      );
    typia.assert(community);
    communities.push(community);
  }
  // 3. Subscribe to all 25 communities
  const subscriptions: IRedditCommunitySubscription[] = [];
  for (const community of communities) {
    const subscription =
      await generate_random_reddit_community_member_member_subscriptions_create(
        memberConnection,
        {
          body: {
            community_id: community.id,
          } satisfies IRedditCommunitySubscription.ICreate,
        },
      );
    typia.assert(subscription);
    subscriptions.push(subscription);
  }
  // 4. Test default pagination (page 1, limit 20)
  const page1Result =
    await api.functional.redditCommunity.member.member.subscriptions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditCommunitySubscription.IRequest,
      },
    );
  typia.assert(page1Result);
  TestValidator.equals("page 1 data count", page1Result.data.length, 20);
  TestValidator.equals(
    "page 1 current page",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 20);
  TestValidator.equals(
    "page 1 total records",
    page1Result.pagination.records,
    25,
  );
  TestValidator.equals("page 1 total pages", page1Result.pagination.pages, 2);
  // 5. Test page 2 with limit 20 - should return remaining 5 items
  const page2Result =
    await api.functional.redditCommunity.member.member.subscriptions.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit: 20,
        } satisfies IRedditCommunitySubscription.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals("page 2 data count", page2Result.data.length, 5);
  TestValidator.equals(
    "page 2 current page",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2Result.pagination.limit, 20);
  TestValidator.equals(
    "page 2 total records",
    page2Result.pagination.records,
    25,
  );
  TestValidator.equals("page 2 total pages", page2Result.pagination.pages, 2);
  // 6. Test custom limit (limit 10) - verify pagination metadata
  const customLimitResult =
    await api.functional.redditCommunity.member.member.subscriptions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditCommunitySubscription.IRequest,
      },
    );
  typia.assert(customLimitResult);
  TestValidator.equals(
    "custom limit data count",
    customLimitResult.data.length,
    10,
  );
  TestValidator.equals(
    "custom limit current page",
    customLimitResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "custom limit limit",
    customLimitResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "custom limit total records",
    customLimitResult.pagination.records,
    25,
  );
  TestValidator.equals(
    "custom limit total pages",
    customLimitResult.pagination.pages,
    3,
  );
  // 7. Test search functionality with partial community name match
  const searchCommunityName = communityNames[0].name;
  const searchQuery = searchCommunityName.substring(0, 10);
  const searchResult =
    await api.functional.redditCommunity.member.member.subscriptions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
          search: searchQuery,
        } satisfies IRedditCommunitySubscription.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.predicate("search returns matching communities", () =>
    searchResult.data.every((sub) =>
      sub.community.name.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
  );
  TestValidator.predicate(
    "search records count matches data length",
    () => searchResult.pagination.records === searchResult.data.length,
  );
  // 8. Test case-insensitive search
  const upperCaseQuery = searchQuery.toUpperCase();
  const caseInsensitiveResult =
    await api.functional.redditCommunity.member.member.subscriptions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
          search: upperCaseQuery,
        } satisfies IRedditCommunitySubscription.IRequest,
      },
    );
  typia.assert(caseInsensitiveResult);
  TestValidator.equals(
    "case-insensitive search returns same count",
    caseInsensitiveResult.data.length,
    searchResult.data.length,
  );
  // 9. Verify ordering is consistent (created_at DESC) across pages
  const allSubscriptions: IRedditCommunitySubscription.ISummary[] = [
    ...page1Result.data,
    ...page2Result.data,
  ];
  for (let i = 1; i < allSubscriptions.length; i++) {
    const prevDate = new Date(allSubscriptions[i - 1].created_at).getTime();
    const currDate = new Date(allSubscriptions[i].created_at).getTime();
    TestValidator.predicate(
      `ordering check: item ${i - 1} >= item ${i}`,
      () => prevDate >= currDate,
    );
  }
  // 10. Verify total records count matches actual subscription count
  TestValidator.equals(
    "total records matches subscriptions",
    page1Result.pagination.records,
    subscriptions.length,
  );
}
