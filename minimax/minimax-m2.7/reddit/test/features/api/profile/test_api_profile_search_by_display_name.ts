import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneUserProfile";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_profile_search_by_display_name(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Search with partial display name (lowercase)
  const searchLower = await api.functional.redditClone.profiles.index(
    connection,
    {
      body: {
        search: "john",
        page: 1,
        limit: 10,
      } satisfies IRedditCloneUserProfile.IRequest,
    },
  );
  typia.assert(searchLower);
  // Validate response structure
  TestValidator.equals(
    "has pagination",
    searchLower.pagination !== undefined,
    true,
  );
  TestValidator.equals("has data array", Array.isArray(searchLower.data), true);
  TestValidator.equals(
    "pagination current is number",
    typeof searchLower.pagination.current === "number",
    true,
  );
  TestValidator.equals(
    "pagination limit is number",
    typeof searchLower.pagination.limit === "number",
    true,
  );
  TestValidator.equals(
    "pagination records is number",
    typeof searchLower.pagination.records === "number",
    true,
  );
  TestValidator.equals(
    "pagination pages is number",
    typeof searchLower.pagination.pages === "number",
    true,
  );
  // If results exist, validate they match search criteria
  if (searchLower.data.length > 0) {
    for (const profile of searchLower.data) {
      TestValidator.predicate(
        "display name contains 'john' (case-insensitive)",
        profile.displayName.toLowerCase().includes("john"),
      );
    }
  }
  // Test 2: Case-insensitive search with uppercase
  const searchUpper = await api.functional.redditClone.profiles.index(
    connection,
    {
      body: {
        search: "JOHN",
        page: 1,
        limit: 10,
      } satisfies IRedditCloneUserProfile.IRequest,
    },
  );
  typia.assert(searchUpper);
  // Both case variations should return results (if matching profiles exist)
  TestValidator.equals(
    "case-insensitive search returns",
    searchUpper.pagination !== undefined,
    true,
  );
  // Test 3: Pagination with limit
  const searchPaginated = await api.functional.redditClone.profiles.index(
    connection,
    {
      body: {
        search: "john",
        page: 1,
        limit: 2,
      } satisfies IRedditCloneUserProfile.IRequest,
    },
  );
  typia.assert(searchPaginated);
  TestValidator.equals(
    "limit respected",
    searchPaginated.data.length <= 2,
    true,
  );
  TestValidator.equals(
    "pagination limit matches request",
    searchPaginated.pagination.limit,
    2,
  );
  TestValidator.equals(
    "current page is 1",
    searchPaginated.pagination.current,
    1,
  );
  // Test 4: Page 2 if available
  if (searchPaginated.pagination.pages > 1) {
    const page2 = await api.functional.redditClone.profiles.index(connection, {
      body: {
        search: "john",
        page: 2,
        limit: 2,
      } satisfies IRedditCloneUserProfile.IRequest,
    });
    typia.assert(page2);
    TestValidator.equals("page 2 current is 2", page2.pagination.current, 2);
  }
  // Test 5: Non-matching search term
  const searchNoMatch = await api.functional.redditClone.profiles.index(
    connection,
    {
      body: {
        search: "xyznonexistent12345",
        page: 1,
        limit: 10,
      } satisfies IRedditCloneUserProfile.IRequest,
    },
  );
  typia.assert(searchNoMatch);
  TestValidator.equals(
    "no results for non-matching",
    searchNoMatch.data.length === 0,
    true,
  );
  // Test 6: Sort by display_name ascending
  const searchSorted = await api.functional.redditClone.profiles.index(
    connection,
    {
      body: {
        search: "john",
        sort: "display_name",
        order: "asc",
        page: 1,
        limit: 10,
      } satisfies IRedditCloneUserProfile.IRequest,
    },
  );
  typia.assert(searchSorted);
  // Verify data is sorted if results exist
  if (searchSorted.data.length > 1) {
    for (let i = 0; i < searchSorted.data.length - 1; i++) {
      const current = searchSorted.data[i].displayName.toLowerCase();
      const next = searchSorted.data[i + 1].displayName.toLowerCase();
      TestValidator.predicate(
        "display names sorted ascending",
        current.localeCompare(next) <= 0,
      );
    }
  }
  // Test 7: Sort by display_name descending
  const searchSortedDesc = await api.functional.redditClone.profiles.index(
    connection,
    {
      body: {
        search: "john",
        sort: "display_name",
        order: "desc",
        page: 1,
        limit: 10,
      } satisfies IRedditCloneUserProfile.IRequest,
    },
  );
  typia.assert(searchSortedDesc);
  if (searchSortedDesc.data.length > 1) {
    for (let i = 0; i < searchSortedDesc.data.length - 1; i++) {
      const current = searchSortedDesc.data[i].displayName.toLowerCase();
      const next = searchSortedDesc.data[i + 1].displayName.toLowerCase();
      TestValidator.predicate(
        "display names sorted descending",
        current.localeCompare(next) >= 0,
      );
    }
  }
  // Test 8: Empty search returns all profiles (paginated)
  const searchAll = await api.functional.redditClone.profiles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IRedditCloneUserProfile.IRequest,
    },
  );
  typia.assert(searchAll);
  TestValidator.equals(
    "empty search returns data",
    searchAll.data.length > 0,
    true,
  );
  TestValidator.equals(
    "empty search has pagination",
    searchAll.pagination !== undefined,
    true,
  );
}
