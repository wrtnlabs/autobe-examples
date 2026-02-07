import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_reddit_platform_communities_search_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Prepare test communities with varying names
  const testCommunities = ArrayUtil.repeat(25, (i) => ({
    name: `community_${RandomGenerator.alphabets(5)}_test_${i}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    subscriberCount: RandomGenerator.alphaNumeric(8),
  }));
  // Create communities through admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // For each community, we need to create it
  // TODO: Replace with actual community creation endpoint when available
  // const communityData = testCommunities[0] satisfies IRedditPlatformCommunity;
  // await api.functional.redditPlatform.communities.create(adminConnection, {
  //   body: communityData,
  // });
  // Test pagination with various limit values
  const testCases = [
    { limit: 5, page: 1 },
    { limit: 10, page: 1 },
    { limit: 10, page: 2 },
    { limit: 25, page: 1 },
    { limit: 30, page: 1 }, // Request more than available
  ];
  for (const testCase of testCases) {
    const result = await api.functional.redditPlatform.communities.search.index(
      connection,
      {
        body: {
          limit: testCase.limit,
          page: testCase.page,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
    typia.assert(result);
    // Validate pagination metadata
    const pagination = result.pagination;
    TestValidator.equals(
      "current page matches request",
      pagination.current,
      testCase.page,
    );
    TestValidator.equals(
      "limit matches request",
      pagination.limit,
      testCase.limit,
    );
    // Calculate expected total records and pages
    const totalRecords = testCommunities.length;
    const expectedPages = Math.ceil(totalRecords / testCase.limit);
    TestValidator.equals(
      "total records correct",
      pagination.records,
      totalRecords,
    );
    TestValidator.equals(
      "total pages correct",
      pagination.pages,
      expectedPages,
    );
    // Validate data array length
    if (testCase.page < expectedPages) {
      TestValidator.equals(
        "full page returned",
        result.data.length,
        testCase.limit,
      );
    } else {
      // Last page may have fewer records
      const expectedLastPageCount = totalRecords % testCase.limit;
      TestValidator.equals(
        "last page count correct",
        result.data.length,
        expectedLastPageCount === 0 ? testCase.limit : expectedLastPageCount,
      );
    }
  }
  // Test empty result set with non-existent search term
  const emptyResult =
    await api.functional.redditPlatform.communities.search.index(connection, {
      body: {
        search: "nonexistent_community_name_xyz",
        limit: 10,
        page: 1,
      } satisfies IRedditPlatformCommunity.IRequest,
    });
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty results count",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals("empty results pages", emptyResult.pagination.pages, 0);
  TestValidator.equals("empty data array", emptyResult.data.length, 0);
  // Test first page edge case
  const firstPage =
    await api.functional.redditPlatform.communities.search.index(connection, {
      body: {
        limit: 5,
        page: 1,
      } satisfies IRedditPlatformCommunity.IRequest,
    });
  typia.assert(firstPage);
  TestValidator.equals("first page has data", firstPage.data.length > 0, true);
  // Test last page edge case
  const totalPages = firstPage.pagination.pages;
  if (totalPages > 0) {
    const lastPage =
      await api.functional.redditPlatform.communities.search.index(connection, {
        body: {
          limit: 5,
          page: totalPages,
        } satisfies IRedditPlatformCommunity.IRequest,
      });
    typia.assert(lastPage);
    TestValidator.equals("last page exists", lastPage.data.length > 0, true);
  }
}
