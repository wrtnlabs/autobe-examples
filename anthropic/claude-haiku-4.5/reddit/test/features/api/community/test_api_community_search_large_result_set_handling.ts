import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";

export async function test_api_community_search_large_result_set_handling(
  connection: api.IConnection,
) {
  // Test 1: Retrieve maximum result set (100 communities)
  const maxLimitResponse: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        limit: 100,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(maxLimitResponse);

  // Verify pagination structure and limits
  TestValidator.equals(
    "current page should start at 0",
    maxLimitResponse.pagination.current,
    0,
  );

  TestValidator.equals(
    "limit should match request",
    maxLimitResponse.pagination.limit,
    100,
  );

  TestValidator.predicate(
    "returned data count should not exceed limit",
    maxLimitResponse.data.length <= 100,
  );

  // Validate community object structure
  if (maxLimitResponse.data.length > 0) {
    const firstCommunity = maxLimitResponse.data[0];
    typia.assert(firstCommunity);

    TestValidator.predicate(
      "community identifier should be valid length",
      firstCommunity.identifier.length >= 3 &&
        firstCommunity.identifier.length <= 32,
    );

    TestValidator.predicate(
      "community name should be valid length",
      firstCommunity.name.length >= 3 && firstCommunity.name.length <= 100,
    );

    TestValidator.predicate(
      "subscriber count should be non-negative",
      firstCommunity.subscriber_count >= 0,
    );

    TestValidator.predicate(
      "post count should be non-negative",
      firstCommunity.post_count >= 0,
    );
  }

  // Test 2: Pagination with offset
  const secondPageResponse: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        limit: 50,
        offset: 50,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(secondPageResponse);

  TestValidator.equals(
    "second page should have correct offset",
    secondPageResponse.pagination.current,
    50,
  );

  // Verify no overlap between pages
  if (maxLimitResponse.data.length > 50 && secondPageResponse.data.length > 0) {
    const firstPageIds = new Set(
      maxLimitResponse.data.slice(0, 50).map((c) => c.id),
    );
    const secondPageIds = secondPageResponse.data.map((c) => c.id);

    const overlapCount = secondPageIds.filter((id) =>
      firstPageIds.has(id),
    ).length;

    TestValidator.predicate(
      "pagination pages should not overlap",
      overlapCount === 0,
    );
  }

  // Test 3: Sorting with large result set
  const sortedResponse: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        sort: "subscriber_count",
        direction: "desc",
        limit: 100,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(sortedResponse);

  TestValidator.predicate(
    "sorted response should return data",
    sortedResponse.data.length > 0,
  );

  // Verify sorting order (descending subscriber count)
  let isSortedCorrectly = true;
  for (let i = 1; i < sortedResponse.data.length; i++) {
    if (
      sortedResponse.data[i].subscriber_count >
      sortedResponse.data[i - 1].subscriber_count
    ) {
      isSortedCorrectly = false;
      break;
    }
  }

  TestValidator.predicate(
    "large result set should be sorted by subscriber_count in descending order",
    isSortedCorrectly,
  );

  // Test 4: Validate pagination metadata
  TestValidator.predicate(
    "total records count should be non-negative",
    maxLimitResponse.pagination.records >= 0,
  );

  TestValidator.equals(
    "total pages should be correctly calculated",
    maxLimitResponse.pagination.pages,
    Math.ceil(
      maxLimitResponse.pagination.records / maxLimitResponse.pagination.limit,
    ),
  );

  // Test 5: Multiple sequential requests for pagination stress test
  const paginationRequests = ArrayUtil.repeat(3, (index) => ({
    offset: index * 30,
    limit: 30,
  }));

  const paginationResults: IPageICommunityPlatformCommunity.ISummary[] = [];
  for (const request of paginationRequests) {
    const response: IPageICommunityPlatformCommunity.ISummary =
      await api.functional.communityPlatform.communities.index(connection, {
        body: {
          offset: request.offset,
          limit: request.limit,
        } satisfies ICommunityPlatformCommunity.IRequest,
      });
    typia.assert(response);
    paginationResults.push(response);
  }

  TestValidator.equals(
    "all sequential pagination requests should complete successfully",
    paginationResults.length,
    3,
  );

  // Verify each response has valid structure
  for (let i = 0; i < paginationResults.length; i++) {
    TestValidator.predicate(
      `pagination result at index ${i} should have valid structure`,
      paginationResults[i].data.length >= 0 &&
        paginationResults[i].pagination.current >= 0,
    );
  }
}
