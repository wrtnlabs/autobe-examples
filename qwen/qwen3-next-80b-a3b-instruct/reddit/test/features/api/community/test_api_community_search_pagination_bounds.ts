import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";

export async function test_api_community_search_pagination_bounds(
  connection: api.IConnection,
) {
  // Test minimum pagination bounds: page=1, items_per_page=1
  const minResponse: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        page: 1,
        items_per_page: 1,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(minResponse);
  TestValidator.equals(
    "minimum page has 1 item",
    minResponse.pagination.perPage,
    1,
  );
  TestValidator.equals(
    "minimum page starts at 1",
    minResponse.pagination.page,
    1,
  );
  TestValidator.equals(
    "minimum page has at least 1 total item",
    minResponse.pagination.totalItems >= 1,
    true,
  );

  // Test maximum pagination bounds: page=1, items_per_page=100
  const maxResponse: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        page: 1,
        items_per_page: 100,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(maxResponse);
  TestValidator.equals(
    "maximum page has 100 items",
    maxResponse.pagination.perPage,
    100,
  );
  TestValidator.equals(
    "maximum page starts at 1",
    maxResponse.pagination.page,
    1,
  );

  // Test invalid page number: page=0
  await TestValidator.error("page=0 should throw error", async () => {
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        page: 0,
        items_per_page: 20,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  });

  // Test invalid page number: page=-1
  await TestValidator.error("page=-1 should throw error", async () => {
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        page: -1,
        items_per_page: 20,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  });

  // Test invalid items_per_page: items_per_page=0
  await TestValidator.error("items_per_page=0 should throw error", async () => {
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        page: 1,
        items_per_page: 0,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  });

  // Test invalid items_per_page: items_per_page=101
  await TestValidator.error(
    "items_per_page=101 should throw error",
    async () => {
      await api.functional.communityPlatform.communities.index(connection, {
        body: {
          page: 1,
          items_per_page: 101,
        } satisfies ICommunityPlatformCommunity.IRequest,
      });
    },
  );

  // Test non-existent page: page=999999 (assuming at least 100 items exist from previous tests)
  const nonExistentResponse: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        page: 999999,
        items_per_page: 20,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(nonExistentResponse);
  TestValidator.equals(
    "non-existent page returns empty data",
    nonExistentResponse.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent page has correct pagination metadata",
    nonExistentResponse.pagination.page,
    999999,
  );
  TestValidator.equals(
    "non-existent page has correct perPage",
    nonExistentResponse.pagination.perPage,
    20,
  );
  TestValidator.equals(
    "non-existent page has hasNext=false",
    nonExistentResponse.pagination.hasNext,
    false,
  );
  TestValidator.equals(
    "non-existent page has hasPrev=true if page>1",
    nonExistentResponse.pagination.hasPrev,
    true,
  );
}
