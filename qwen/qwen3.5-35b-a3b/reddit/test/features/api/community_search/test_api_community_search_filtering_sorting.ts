import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test advanced filtering and sorting capabilities for community discovery.
 * Validates subscriber count range filtering, sorting by different fields,
 * pagination with various limit values, empty search queries, and no matching results.
 *
 * Note: This test works with existing communities in the database and cannot
 * create test data. It validates the search endpoint's filtering and sorting
 * behavior based on pre-existing data.
 */
export async function test_api_community_search_filtering_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test minSubscribers filter - should return communities with 100+ subscribers
  {
    const response =
      await api.functional.redditPlatform.communities.search.index(connection, {
        body: {
          minSubscribers: 100,
        } satisfies IRedditPlatformCommunity.IRequest,
      });
    typia.assert(response);
    // Verify all returned communities have >= 100 subscribers
    for (const community of response.data) {
      TestValidator.predicate(
        "community has >= 100 subscribers",
        community.subscriber_count >= 100,
      );
    }
  }
  // 2. Test maxSubscribers filter - should return communities with <= 100 subscribers
  {
    const response =
      await api.functional.redditPlatform.communities.search.index(connection, {
        body: {
          maxSubscribers: 100,
        } satisfies IRedditPlatformCommunity.IRequest,
      });
    typia.assert(response);
    // Verify all returned communities have <= 100 subscribers
    for (const community of response.data) {
      TestValidator.predicate(
        "community has <= 100 subscribers",
        community.subscriber_count <= 100,
      );
    }
  }
  // 3. Test combined min/max subscriber filters
  {
    const response =
      await api.functional.redditPlatform.communities.search.index(connection, {
        body: {
          minSubscribers: 100,
          maxSubscribers: 1000,
        } satisfies IRedditPlatformCommunity.IRequest,
      });
    typia.assert(response);
    // Verify all returned communities are within range
    for (const community of response.data) {
      TestValidator.predicate(
        "community within subscriber range",
        community.subscriber_count >= 100 && community.subscriber_count <= 1000,
      );
    }
  }
  // 4. Test sorting by name (ascending)
  {
    const response =
      await api.functional.redditPlatform.communities.search.index(connection, {
        body: {
          sort: "name",
          order: "asc",
        } satisfies IRedditPlatformCommunity.IRequest,
      });
    typia.assert(response);
    // Verify communities are sorted alphabetically A-Z
    const names = response.data.map((c) => c.name);
    const sortedNames = [...names].sort();
    TestValidator.equals("name ascending sort", names, sortedNames);
  }
  // 5. Test sorting by name (descending)
  {
    const response =
      await api.functional.redditPlatform.communities.search.index(connection, {
        body: {
          sort: "name",
          order: "desc",
        } satisfies IRedditPlatformCommunity.IRequest,
      });
    typia.assert(response);
    // Verify communities are sorted alphabetically Z-A
    const names = response.data.map((c) => c.name);
    const sortedNames = [...names].sort().reverse();
    TestValidator.equals("name descending sort", names, sortedNames);
  }
  // 6. Test sorting by subscriber_count (descending)
  {
    const response =
      await api.functional.redditPlatform.communities.search.index(connection, {
        body: {
          sort: "subscriber_count",
          order: "desc",
        } satisfies IRedditPlatformCommunity.IRequest,
      });
    typia.assert(response);
    // Verify communities are sorted by subscriber count descending
    const counts = response.data.map((c) => c.subscriber_count);
    const sortedCounts = [...counts].sort((a, b) => b - a);
    TestValidator.equals(
      "subscriber_count descending sort",
      counts,
      sortedCounts,
    );
  }
  // 7. Test sorting by created_at (descending) - default behavior
  {
    const response =
      await api.functional.redditPlatform.communities.search.index(connection, {
        body: {
          sort: "created_at",
          order: "desc",
        } satisfies IRedditPlatformCommunity.IRequest,
      });
    typia.assert(response);
    // Verify communities are sorted by creation date descending (newest first)
    const dates = response.data.map((c) => new Date(c.created_at).getTime());
    const sortedDates = [...dates].sort((a, b) => b - a);
    TestValidator.equals("created_at descending sort", dates, sortedDates);
  }
  // 8. Test pagination with limit=1
  {
    const response =
      await api.functional.redditPlatform.communities.search.index(connection, {
        body: {
          limit: 1,
          page: 1,
        } satisfies IRedditPlatformCommunity.IRequest,
      });
    typia.assert(response);
    TestValidator.equals("pagination limit 1", response.data.length, 1);
    TestValidator.equals(
      "pagination limit field",
      response.pagination.limit,
      1,
    );
    TestValidator.equals(
      "pagination current page",
      response.pagination.current,
      1,
    );
    TestValidator.predicate(
      "pagination records matches data",
      response.pagination.records === response.data.length,
    );
  }
  // 9. Test pagination with limit=10
  {
    const response =
      await api.functional.redditPlatform.communities.search.index(connection, {
        body: {
          limit: 10,
          page: 1,
        } satisfies IRedditPlatformCommunity.IRequest,
      });
    typia.assert(response);
    TestValidator.equals("pagination limit 10", response.data.length, 10);
    TestValidator.equals(
      "pagination limit field",
      response.pagination.limit,
      10,
    );
    TestValidator.equals(
      "pagination current page",
      response.pagination.current,
      1,
    );
  }
  // 10. Test pagination with limit=50
  {
    const response =
      await api.functional.redditPlatform.communities.search.index(connection, {
        body: {
          limit: 50,
          page: 1,
        } satisfies IRedditPlatformCommunity.IRequest,
      });
    typia.assert(response);
    TestValidator.equals("pagination limit 50", response.data.length, 50);
    TestValidator.equals(
      "pagination limit field",
      response.pagination.limit,
      50,
    );
  }
  // 11. Test pagination with limit=100
  {
    const response =
      await api.functional.redditPlatform.communities.search.index(connection, {
        body: {
          limit: 100,
          page: 1,
        } satisfies IRedditPlatformCommunity.IRequest,
      });
    typia.assert(response);
    TestValidator.equals("pagination limit 100", response.data.length, 100);
    TestValidator.equals(
      "pagination limit field",
      response.pagination.limit,
      100,
    );
  }
  // 12. Test page navigation - page 2 should return different results
  {
    const page1Response =
      await api.functional.redditPlatform.communities.search.index(connection, {
        body: {
          limit: 5,
          page: 1,
        } satisfies IRedditPlatformCommunity.IRequest,
      });
    typia.assert(page1Response);
    const page2Response =
      await api.functional.redditPlatform.communities.search.index(connection, {
        body: {
          limit: 5,
          page: 2,
        } satisfies IRedditPlatformCommunity.IRequest,
      });
    typia.assert(page2Response);
    TestValidator.equals("page 2 current", page2Response.pagination.current, 2);
    TestValidator.equals(
      "page 2 records",
      page2Response.pagination.records,
      page1Response.pagination.records,
    );
    TestValidator.notEquals(
      "page 1 and 2 data differ",
      page1Response.data,
      page2Response.data,
    );
  }
  // 13. Test empty search query - should return all communities
  {
    const response =
      await api.functional.redditPlatform.communities.search.index(connection, {
        body: {
          name: "",
        } satisfies IRedditPlatformCommunity.IRequest,
      });
    typia.assert(response);
    // Should return all communities without name filtering
    TestValidator.predicate(
      "empty name returns communities",
      response.data.length > 0,
    );
  }
  // 14. Test no matching results - search for non-existent term
  {
    const response =
      await api.functional.redditPlatform.communities.search.index(connection, {
        body: {
          name: "xyz123notfound",
        } satisfies IRedditPlatformCommunity.IRequest,
      });
    typia.assert(response);
    TestValidator.equals("no results data array", response.data.length, 0);
    TestValidator.equals("no results records", response.pagination.records, 0);
    TestValidator.equals("no results pages", response.pagination.pages, 0);
  }
  // 15. Test pagination metadata accuracy
  {
    const response =
      await api.functional.redditPlatform.communities.search.index(connection, {
        body: {
          limit: 10,
          page: 3,
        } satisfies IRedditPlatformCommunity.IRequest,
      });
    typia.assert(response);
    // pages should be ceiling of records / limit
    const expectedPages = Math.ceil(
      response.pagination.records / response.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation",
      response.pagination.pages,
      expectedPages,
    );
  }
}
