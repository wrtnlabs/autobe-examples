import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";

export async function test_api_community_search_sorting_by_post_count(
  connection: api.IConnection,
) {
  // Test 1: Search and sort by post_count in descending order (most active first)
  const descResponse = await api.functional.communityPlatform.communities.index(
    connection,
    {
      body: {
        sort: "post_count",
        direction: "desc",
        limit: 20,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(descResponse);

  // Verify pagination structure
  TestValidator.predicate(
    "descending response should have pagination",
    descResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "descending response should have data array",
    Array.isArray(descResponse.data),
  );

  // Verify descending order: post_count should decrease or stay same
  if (descResponse.data.length > 1) {
    for (let i = 0; i < descResponse.data.length - 1; i++) {
      TestValidator.predicate(
        `post_count at index ${i} should be >= post_count at index ${i + 1} in descending order`,
        descResponse.data[i].post_count >= descResponse.data[i + 1].post_count,
      );
    }
  }

  // Test 2: Search and sort by post_count in ascending order (least active first)
  const ascResponse = await api.functional.communityPlatform.communities.index(
    connection,
    {
      body: {
        sort: "post_count",
        direction: "asc",
        limit: 20,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(ascResponse);

  // Verify pagination structure
  TestValidator.predicate(
    "ascending response should have pagination",
    ascResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "ascending response should have data array",
    Array.isArray(ascResponse.data),
  );

  // Verify ascending order: post_count should increase or stay same
  if (ascResponse.data.length > 1) {
    for (let i = 0; i < ascResponse.data.length - 1; i++) {
      TestValidator.predicate(
        `post_count at index ${i} should be <= post_count at index ${i + 1} in ascending order`,
        ascResponse.data[i].post_count <= ascResponse.data[i + 1].post_count,
      );
    }
  }

  // Test 3: Verify post_count values are non-negative
  for (const community of descResponse.data) {
    TestValidator.predicate(
      `community ${community.id} should have non-negative post_count`,
      community.post_count >= 0,
    );
  }

  // Test 4: Test sorting with pagination - verify consistency across pages
  const page1 = await api.functional.communityPlatform.communities.index(
    connection,
    {
      body: {
        sort: "post_count",
        direction: "desc",
        limit: 5,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(page1);

  const page2 = await api.functional.communityPlatform.communities.index(
    connection,
    {
      body: {
        sort: "post_count",
        direction: "desc",
        limit: 5,
        offset: 5,
      } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(page2);

  // Verify page boundaries maintain order
  if (page1.data.length > 0 && page2.data.length > 0) {
    TestValidator.predicate(
      "last post_count of page 1 should be >= first post_count of page 2",
      page1.data[page1.data.length - 1].post_count >= page2.data[0].post_count,
    );
  }

  // Test 5: Test sorting with visibility filter
  const filteredResponse =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        sort: "post_count",
        direction: "desc",
        visibility: "public",
        limit: 20,
        offset: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(filteredResponse);

  // Verify descending order with filter applied
  if (filteredResponse.data.length > 1) {
    for (let i = 0; i < filteredResponse.data.length - 1; i++) {
      TestValidator.predicate(
        `filtered result at index ${i} should have post_count >= index ${i + 1}`,
        filteredResponse.data[i].post_count >=
          filteredResponse.data[i + 1].post_count,
      );
    }
  }

  // Test 6: Verify pagination metadata
  TestValidator.predicate(
    "current page should be 0",
    descResponse.pagination.current === 0,
  );
  TestValidator.predicate(
    "limit should be 20",
    descResponse.pagination.limit === 20,
  );
  TestValidator.predicate(
    "total records should be non-negative",
    descResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be non-negative",
    descResponse.pagination.pages >= 0,
  );
}
