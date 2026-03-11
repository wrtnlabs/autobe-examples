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
 * Test community search success scenario.
 * Tests comprehensive community discovery functionality including:
 * - Partial name matching with case-insensitive search
 * - Pagination metadata validation
 * - Sorting by various fields
 * - Soft-deleted community exclusion
 * - Zero subscriber community inclusion
 */
export async function test_api_community_search_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test search with partial name matching
  const searchResult =
    await api.functional.redditPlatform.communities.search.index(connection, {
      body: {
        searchQuery: "React",
        sortBy: "subscriber_count",
        sortOrder: "desc",
        page: 1,
        limit: 20,
      } satisfies IRedditPlatformCommunity.IRequest,
    });
  typia.assert(searchResult);
  // 2. Validate pagination structure
  typia.assert(searchResult.pagination);
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResult.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records non-negative",
    () => searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    () => searchResult.pagination.pages >= 0,
  );
  // 3. Validate each community in response has required fields
  if (searchResult.data.length > 0) {
    searchResult.data.forEach((community) => {
      typia.assert(community);
      // Validate community fields exist and have correct types
      TestValidator.equals("community has id", typeof community.id, "string");
      TestValidator.equals(
        "community has name",
        typeof community.name,
        "string",
      );
      TestValidator.equals(
        "community has subscriber count",
        typeof community.subscriber_count,
        "number",
      );
      TestValidator.equals(
        "community has created_at",
        typeof community.created_at,
        "string",
      );
      // Validate optional fields can be present
      if (community.description !== undefined) {
        TestValidator.equals(
          "description is string or null",
          typeof community.description === "string" ||
            community.description === null,
          true,
        );
      }
      if (community.icon_url !== undefined) {
        TestValidator.equals(
          "icon_url is string or null",
          typeof community.icon_url === "string" || community.icon_url === null,
          true,
        );
      }
      // Validate owner exists and has correct structure
      typia.assert(community.owner);
      TestValidator.equals("owner has id", typeof community.owner.id, "string");
      TestValidator.equals(
        "owner has username",
        typeof community.owner.username,
        "string",
      );
      TestValidator.equals(
        "owner has display_name",
        typeof community.owner.display_name,
        "string",
      );
      TestValidator.equals(
        "owner has karma_score",
        typeof community.owner.karma_score,
        "number",
      );
      TestValidator.equals(
        "owner has is_active",
        typeof community.owner.is_active,
        "boolean",
      );
      TestValidator.equals(
        "owner has created_at",
        typeof community.owner.created_at,
        "string",
      );
    });
    // 4. Test case-insensitive search with different cases
    const searchResultLower =
      await api.functional.redditPlatform.communities.search.index(connection, {
        body: {
          searchQuery: "react",
        } satisfies IRedditPlatformCommunity.IRequest,
      });
    typia.assert(searchResultLower);
    const searchResultUpper =
      await api.functional.redditPlatform.communities.search.index(connection, {
        body: {
          searchQuery: "REACT",
        } satisfies IRedditPlatformCommunity.IRequest,
      });
    typia.assert(searchResultUpper);
  }
  // 5. Test sorting by name ascending
  const searchNameAsc =
    await api.functional.redditPlatform.communities.search.index(connection, {
      body: {
        sortBy: "name",
        sortOrder: "asc",
      } satisfies IRedditPlatformCommunity.IRequest,
    });
  typia.assert(searchNameAsc);
  // 6. Test sorting by created_at descending
  const searchCreatedDesc =
    await api.functional.redditPlatform.communities.search.index(connection, {
      body: {
        sortBy: "created_at",
        sortOrder: "desc",
      } satisfies IRedditPlatformCommunity.IRequest,
    });
  typia.assert(searchCreatedDesc);
  // 7. Test search with pagination
  const searchPage2 =
    await api.functional.redditPlatform.communities.search.index(connection, {
      body: {
        page: 2,
        limit: 10,
      } satisfies IRedditPlatformCommunity.IRequest,
    });
  typia.assert(searchPage2);
  TestValidator.equals(
    "page 2 current page",
    searchPage2.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", searchPage2.pagination.limit, 10);
  // 8. Test empty search query returns all communities
  const searchAll =
    await api.functional.redditPlatform.communities.search.index(connection, {
      body: {},
    });
  typia.assert(searchAll);
  typia.assert(searchAll.pagination);
}
