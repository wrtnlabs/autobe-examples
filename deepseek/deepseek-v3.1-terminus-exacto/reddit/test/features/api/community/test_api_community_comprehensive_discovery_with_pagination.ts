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

export async function test_api_community_comprehensive_discovery_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Since no community creation API is available in the provided SDK functions,
  // and no utility functions exist for creating test communities,
  // this test will focus on validating the search functionality with existing data
  // and testing pagination behavior with available parameters
  const anonymousConnection: api.IConnection = { host: connection.host };
  // Test 1: Basic search with pagination
  const startTime = Date.now();
  const searchResult =
    await api.functional.communityPlatform.communities.search(
      anonymousConnection,
      {
        body: {
          search: "test",
          sort: "subscriber_count",
          page: 2,
          limit: 5,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  const responseTime = Date.now() - startTime;
  typia.assert(searchResult);
  // Validate performance requirement: search within 1 second
  TestValidator.predicate(
    "search response time under 1 second",
    responseTime <= 1000,
  );
  // Validate pagination metadata
  TestValidator.equals("current page", searchResult.pagination.current, 2);
  TestValidator.equals("page limit", searchResult.pagination.limit, 5);
  TestValidator.predicate(
    "records count valid",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count valid",
    searchResult.pagination.pages >= 0,
  );
  // Validate data structure for each community
  if (searchResult.data.length > 0) {
    for (const community of searchResult.data) {
      typia.assert(community);
      TestValidator.predicate("community has id", !!community.id);
      TestValidator.predicate("community has name", !!community.name);
      TestValidator.predicate(
        "community has description",
        !!community.description,
      );
      TestValidator.predicate("community has owner", !!community.owner);
      TestValidator.predicate(
        "community has creation date",
        !!community.created_at,
      );
    }
  }
  // Test 2: Empty search term (browse all communities)
  const browseStartTime = Date.now();
  const browseResult =
    await api.functional.communityPlatform.communities.search(
      anonymousConnection,
      {
        body: {
          search: "",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  const browseResponseTime = Date.now() - browseStartTime;
  typia.assert(browseResult);
  TestValidator.predicate(
    "browse response time under 2 seconds",
    browseResponseTime <= 2000,
  );
  // Test 3: First page behavior
  const firstPageResult =
    await api.functional.communityPlatform.communities.search(
      anonymousConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(firstPageResult);
  TestValidator.equals(
    "first page current",
    firstPageResult.pagination.current,
    1,
  );
  // Test 4: Search with non-matching term (empty result set)
  const nonMatchingResult =
    await api.functional.communityPlatform.communities.search(
      anonymousConnection,
      {
        body: {
          search: "nonexistentcommunitynamethatshouldnotmatchanything",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(nonMatchingResult);
  TestValidator.predicate(
    "non-matching search returns valid pagination",
    nonMatchingResult.pagination.records >= 0,
  );
  // Test 5: Different sorting options
  const nameSortResult =
    await api.functional.communityPlatform.communities.search(
      anonymousConnection,
      {
        body: {
          sort: "name",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(nameSortResult);
  const dateSortResult =
    await api.functional.communityPlatform.communities.search(
      anonymousConnection,
      {
        body: {
          sort: "created_at",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(dateSortResult);
  // Test 6: Maximum limit boundary
  const maxLimitResult =
    await api.functional.communityPlatform.communities.search(
      anonymousConnection,
      {
        body: {
          limit: 100,
          page: 1,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
  typia.assert(maxLimitResult);
  TestValidator.equals("maximum limit", maxLimitResult.pagination.limit, 100);
}
