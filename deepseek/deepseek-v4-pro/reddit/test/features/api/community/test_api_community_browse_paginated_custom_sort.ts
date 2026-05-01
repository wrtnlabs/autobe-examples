import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_browse_paginated_custom_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Fetch baseline - all communities to determine total pages
  const all = await api.functional.communityHub.communities.index(connection, {
    body: {
      limit: 100,
    } satisfies ICommunityHubCommunity.IRequest,
  });
  typia.assert(all);
  // 2. Test sort by "newest" (created_at descending) with pagination
  const newestResult = await api.functional.communityHub.communities.index(
    connection,
    {
      body: {
        page: 2,
        limit: 5,
        sort: "newest",
      } satisfies ICommunityHubCommunity.IRequest,
    },
  );
  typia.assert(newestResult);
  TestValidator.equals(
    "newest pagination current page",
    newestResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "newest pagination limit",
    newestResult.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "newest pagination records non-negative",
    newestResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "newest pagination pages non-negative",
    newestResult.pagination.pages >= 0,
  );
  // Validate descending order by created_at
  if (newestResult.data.length >= 2) {
    for (let i = 0; i < newestResult.data.length - 1; i++) {
      TestValidator.predicate(
        "newest sort: created_at descending",
        new Date(newestResult.data[i].created_at).getTime() >=
          new Date(newestResult.data[i + 1].created_at).getTime(),
      );
    }
  }
  // 3. Test sort by "name" (alphabetical ascending)
  const nameResult = await api.functional.communityHub.communities.index(
    connection,
    {
      body: {
        limit: 100,
        sort: "name",
      } satisfies ICommunityHubCommunity.IRequest,
    },
  );
  typia.assert(nameResult);
  if (nameResult.data.length >= 2) {
    for (let i = 0; i < nameResult.data.length - 1; i++) {
      TestValidator.predicate(
        "name sort: alphabetical ascending",
        nameResult.data[i].name.localeCompare(nameResult.data[i + 1].name) <= 0,
      );
    }
  }
  // 4. Test unrecognized sort value falls back silently to "popular"
  const invalidSortResult = await api.functional.communityHub.communities.index(
    connection,
    {
      body: {
        sort: "invalid_sort",
      } satisfies ICommunityHubCommunity.IRequest,
    },
  );
  typia.assert(invalidSortResult);
  // Validate fallback to "popular" ordering (subscriber_count descending)
  if (invalidSortResult.data.length >= 2) {
    for (let i = 0; i < invalidSortResult.data.length - 1; i++) {
      TestValidator.predicate(
        "invalid sort fallback: subscriber_count descending",
        invalidSortResult.data[i].subscriber_count >=
          invalidSortResult.data[i + 1].subscriber_count,
      );
    }
  }
  // 5. Test page beyond total pages returns empty data
  const totalPages = all.pagination.pages;
  const beyondPage = totalPages + 10;
  const beyondPageResult = await api.functional.communityHub.communities.index(
    connection,
    {
      body: {
        page: beyondPage satisfies number as number,
        limit: 5,
      } satisfies ICommunityHubCommunity.IRequest,
    },
  );
  typia.assert(beyondPageResult);
  TestValidator.equals(
    "beyond last page: empty data array",
    beyondPageResult.data.length,
    0,
  );
  TestValidator.predicate(
    "beyond last page: pagination current is valid",
    beyondPageResult.pagination.current >= 1,
  );
}
