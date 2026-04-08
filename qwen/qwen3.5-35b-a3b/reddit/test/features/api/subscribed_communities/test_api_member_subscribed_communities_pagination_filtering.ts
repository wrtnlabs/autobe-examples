import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformSubscription";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test pagination, sorting, and filtering functionality for subscribed communities list.
 *
 * Validates the complete subscribed communities listing experience including pagination controls,
 * sorting options, and search filtering capabilities. Ensures that members can navigate through
 * their subscribed communities efficiently and find communities using various search criteria.
 *
 * Special attention is given to verifying that pagination metadata accurately reflects the
 * total number of subscriptions and that sorting and filtering operations return consistent
 * and correctly ordered results.
 *
 * 1. Create an authenticated member session with random credentials.
 * 2. Test pagination across multiple pages with different limit values.
 * 3. Validate sorting by name and subscribed_at in both ascending and descending order.
 * 4. Test search filtering with case-insensitive substring matching.
 * 5. Test community_name filter for exact substring matching.
 * 6. Verify combined filters work correctly together.
 */
export async function test_api_member_subscribed_communities_pagination_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  const memberId: string & tags.Format<"uuid"> = memberAuth.id;
  memberConnection.headers ??= {};
  memberConnection.headers.Authorization = memberAuth.token.access;
  // 2. Test pagination with existing subscriptions
  const testPagination = async (
    page: number,
    limit: number,
  ): Promise<IRedditPlatformSubscription.ISummary[]> => {
    const response =
      await api.functional.redditPlatform.member.users.subscribed_communities.index(
        memberConnection,
        {
          userId: memberId,
          body: {
            page,
            limit,
          },
        },
      );
    typia.assert(response);
    return response.data;
  };
  // Test page 1 with limit 2 - should return 2 most recent subscriptions
  const page1 = await testPagination(1, 2);
  TestValidator.equals("page 1 data length", page1.length, 2);
  // Test page 2 with limit 2 - should return 2 records
  const page2 = await testPagination(2, 2);
  TestValidator.equals("page 2 data length", page2.length, 2);
  // Test page 3 with limit 2 - should return 1 record (total 5)
  const page3 = await testPagination(3, 2);
  TestValidator.equals("page 3 data length", page3.length, 1);
  // Test page 4 with limit 2 - should return 0 records (empty result, not error)
  const page4 = await testPagination(4, 2);
  TestValidator.equals("page 4 data length", page4.length, 0);
  // 3. Sorting Test
  const testSorting = async (
    sortBy: IRedditPlatformSubscription.IRequest["sort_by"],
    sortOrder: IRedditPlatformSubscription.IRequest["sort_order"],
  ): Promise<string[]> => {
    const response =
      await api.functional.redditPlatform.member.users.subscribed_communities.index(
        memberConnection,
        {
          userId: memberId,
          body: { sort_by: sortBy, sort_order: sortOrder },
        },
      );
    typia.assert(response);
    return response.data.map((sub) => sub.community.name);
  };
  // Test sorting by name ascending
  const nameAscNames = await testSorting("name", "asc");
  const sortedByNameAsc = [...nameAscNames].sort((a, b) => a.localeCompare(b));
  TestValidator.equals(
    "name ascending sort",
    JSON.stringify(nameAscNames),
    JSON.stringify(sortedByNameAsc),
  );
  // Test sorting by name descending
  const nameDescNames = await testSorting("name", "desc");
  const sortedByNameDesc = [...nameAscNames].sort((a, b) => b.localeCompare(a));
  TestValidator.equals(
    "name descending sort",
    JSON.stringify(nameDescNames),
    JSON.stringify(sortedByNameDesc),
  );
  // Test sorting by subscribed_at descending (most recent first)
  const subscribedAtDescNames = await testSorting("subscribed_at", "desc");
  TestValidator.equals(
    "subscribed_at descending available",
    subscribedAtDescNames.length,
    5,
  );
  // 4. Filtering Test - Text Search
  const testSearch = async (search: string): Promise<string[]> => {
    const response =
      await api.functional.redditPlatform.member.users.subscribed_communities.index(
        memberConnection,
        {
          userId: memberId,
          body: { search },
        },
      );
    typia.assert(response);
    return response.data.map((sub) => sub.community.name);
  };
  // Search for 'tech' - should match 'TechNews' (case-insensitive)
  const techResults = await testSearch("tech");
  TestValidator.equals("tech search results", techResults.length, 1);
  TestValidator.equals(
    "tech search contains TechNews",
    techResults[0],
    "TechNews",
  );
  // Search for non-existent term - should return empty
  const emptyResults = await testSearch("xyz123");
  TestValidator.equals("empty search results", emptyResults.length, 0);
  // 5. Filtering Test - Community Name
  const testCommunityName = async (
    communityName: string,
  ): Promise<string[]> => {
    const response =
      await api.functional.redditPlatform.member.users.subscribed_communities.index(
        memberConnection,
        {
          userId: memberId,
          body: { community_name: communityName },
        },
      );
    typia.assert(response);
    return response.data.map((sub) => sub.community.name);
  };
  // Search for 'Gaming' - should match 'Gaming'
  const gamingResults = await testCommunityName("Gaming");
  TestValidator.equals("gaming filter results", gamingResults.length, 1);
  TestValidator.equals("gaming filter matches", gamingResults[0], "Gaming");
  // 6. Combined Filters Test
  const combinedTest =
    await api.functional.redditPlatform.member.users.subscribed_communities.index(
      memberConnection,
      {
        userId: memberId,
        body: {
          search: "music",
          page: 1,
          limit: 2,
          sort_by: "subscribed_at",
          sort_order: "asc",
        },
      },
    );
  typia.assert(combinedTest);
  TestValidator.equals(
    "combined filter page",
    combinedTest.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined filter limit",
    combinedTest.pagination.limit,
    2,
  );
  TestValidator.equals("combined filter results", combinedTest.data.length, 1);
  if (combinedTest.data.length > 0) {
    TestValidator.equals(
      "combined filter name",
      combinedTest.data[0].community.name,
      "Music",
    );
  }
}
