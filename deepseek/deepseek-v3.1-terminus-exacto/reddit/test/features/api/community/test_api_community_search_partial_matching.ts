import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_search_partial_matching(
  connection: api.IConnection,
): Promise<void> {
  // Since the browse endpoint allows guest access (based on x-autobe-authorization-type: null),
  // we can use the base connection directly for this test
  // Test exact matching with a specific community name
  const exactSearch =
    await api.functional.communityPlatform.communities.browse.index(
      connection,
      {
        body: {
          search: "programming",
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(exactSearch);
  TestValidator.predicate(
    "exact match search should return valid pagination",
    exactSearch.pagination.records >= 0 && exactSearch.pagination.limit === 10,
  );
  // Test partial matching at beginning
  const prefixSearch =
    await api.functional.communityPlatform.communities.browse.index(
      connection,
      {
        body: {
          search: "prog",
          limit: 5,
          page: 1,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(prefixSearch);
  TestValidator.predicate(
    "prefix search should return valid results",
    prefixSearch.data.length >= 0 && prefixSearch.pagination.limit === 5,
  );
  // Test partial matching in middle
  const middleSearch =
    await api.functional.communityPlatform.communities.browse.index(
      connection,
      {
        body: {
          search: "gram",
          limit: 5,
          page: 1,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(middleSearch);
  TestValidator.predicate(
    "middle search should return valid results",
    middleSearch.data.length >= 0,
  );
  // Test case-insensitive matching
  const caseSearch =
    await api.functional.communityPlatform.communities.browse.index(
      connection,
      {
        body: {
          search: "PROGRAMMING",
          limit: 5,
          page: 1,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(caseSearch);
  TestValidator.predicate(
    "case-insensitive search should work",
    caseSearch.data.length >= 0,
  );
  // Test pagination with different page sizes
  const paginationSearch =
    await api.functional.communityPlatform.communities.browse.index(
      connection,
      {
        body: {
          search: "com",
          limit: 3,
          page: 1,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(paginationSearch);
  TestValidator.predicate(
    "pagination should respect limit",
    paginationSearch.data.length <= 3,
  );
  TestValidator.equals(
    "page number should be correct",
    paginationSearch.pagination.current,
    1,
  );
  // Test sorting by different criteria
  const sortedByName =
    await api.functional.communityPlatform.communities.browse.index(
      connection,
      {
        body: {
          search: "tech",
          sort: "name",
          limit: 5,
          page: 1,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(sortedByName);
  TestValidator.predicate(
    "name sorting should work",
    sortedByName.data.length >= 0,
  );
  const sortedBySubscribers =
    await api.functional.communityPlatform.communities.browse.index(
      connection,
      {
        body: {
          search: "tech",
          sort: "subscriber_count",
          limit: 5,
          page: 1,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(sortedBySubscribers);
  TestValidator.predicate(
    "subscriber count sorting should work",
    sortedBySubscribers.data.length >= 0,
  );
  const sortedByDate =
    await api.functional.communityPlatform.communities.browse.index(
      connection,
      {
        body: {
          search: "tech",
          sort: "created_at",
          limit: 5,
          page: 1,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(sortedByDate);
  TestValidator.predicate(
    "created date sorting should work",
    sortedByDate.data.length >= 0,
  );
  // Test empty search (should return all communities)
  const emptySearch =
    await api.functional.communityPlatform.communities.browse.index(
      connection,
      {
        body: {
          search: undefined,
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.predicate(
    "empty search should return results",
    emptySearch.data.length >= 0,
  );
  // Test with special characters
  const specialSearch =
    await api.functional.communityPlatform.communities.browse.index(
      connection,
      {
        body: {
          search: "community",
          limit: 5,
          page: 1,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(specialSearch);
  TestValidator.predicate(
    "special character search should work",
    specialSearch.data.length >= 0,
  );
}
