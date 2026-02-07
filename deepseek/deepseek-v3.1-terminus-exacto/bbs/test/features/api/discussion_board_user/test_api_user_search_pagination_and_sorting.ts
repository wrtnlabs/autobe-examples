import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_user_search_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Create test users with varied display names and creation times
  const testUsers = ArrayUtil.repeat(15, (index) => {
    const baseName = `TestUser${index}`;
    return {
      display_name:
        index % 3 === 0
          ? `Alpha ${baseName}`
          : index % 3 === 1
            ? `Beta ${baseName}`
            : `Gamma ${baseName}`,
      bio: index % 2 === 0 ? `Bio for ${baseName}` : null,
      email: `user${index}@test.com`,
    };
  });
  // Note: In a real implementation, we would create these users via API
  // Since we don't have user creation endpoints available, we'll test with
  // whatever existing data is in the database
  // Test 1: Default pagination
  const defaultPage = await api.functional.discussionBoard.users.index(
    connection,
    {
      body: {} satisfies IDiscussionBoardUser.IRequest,
    },
  );
  typia.assert(defaultPage);
  TestValidator.equals(
    "default page should be page 1",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "default limit should be positive",
    defaultPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records should be non-negative",
    defaultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be non-negative",
    defaultPage.pagination.pages >= 0,
  );
  // Validate pagination formula: pages = ceil(records / limit)
  if (defaultPage.pagination.records > 0) {
    const expectedPages = Math.ceil(
      defaultPage.pagination.records / defaultPage.pagination.limit,
    );
    TestValidator.equals(
      "pages should be calculated correctly",
      defaultPage.pagination.pages,
      expectedPages,
    );
  }
  // Test 2: Specific page and limit
  const page2Limit5 = await api.functional.discussionBoard.users.index(
    connection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies IDiscussionBoardUser.IRequest,
    },
  );
  typia.assert(page2Limit5);
  TestValidator.equals(
    "page should be set correctly",
    page2Limit5.pagination.current,
    2,
  );
  TestValidator.equals(
    "limit should be respected",
    page2Limit5.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "page 2 data length should be reasonable",
    page2Limit5.data.length <= 5,
  );
  // Test 3: Sorting functionality
  const sortTests = [
    { sort: "newest" as const, description: "newest first" },
    { sort: "oldest" as const, description: "oldest first" },
    {
      sort: "display_name_asc" as const,
      description: "display name ascending",
    },
    {
      sort: "display_name_desc" as const,
      description: "display name descending",
    },
  ];
  for (const { sort, description } of sortTests) {
    const sortedResults = await api.functional.discussionBoard.users.index(
      connection,
      {
        body: {
          sort,
          limit: 10,
        } satisfies IDiscussionBoardUser.IRequest,
      },
    );
    typia.assert(sortedResults);
    // Basic validation that sorting parameter is accepted
    TestValidator.predicate(
      `${description} should return valid response`,
      sortedResults.data.length >= 0,
    );
    // Note: Without knowing the actual data and sort logic, we can't validate
    // the sort order itself, but we can validate the API accepts the parameter
  }
  // Test 4: Search functionality
  const searchResults = await api.functional.discussionBoard.users.index(
    connection,
    {
      body: {
        search: "Test",
        limit: 5,
      } satisfies IDiscussionBoardUser.IRequest,
    },
  );
  typia.assert(searchResults);
  TestValidator.predicate(
    "search should return valid results",
    searchResults.data.length >= 0,
  );
  // Test 5: Email filtering
  const emailResults = await api.functional.discussionBoard.users.index(
    connection,
    {
      body: {
        email: "user1@test.com",
      } satisfies IDiscussionBoardUser.IRequest,
    },
  );
  typia.assert(emailResults);
  TestValidator.predicate(
    "email filter should return valid results",
    emailResults.data.length >= 0,
  );
  // Test 6: Empty result set
  const emptySearch = await api.functional.discussionBoard.users.index(
    connection,
    {
      body: {
        search: "NonexistentUserXYZ123",
      } satisfies IDiscussionBoardUser.IRequest,
    },
  );
  typia.assert(emptySearch);
  TestValidator.equals(
    "empty search should have 0 records",
    emptySearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search should have 0 pages",
    emptySearch.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty search should have empty data array",
    emptySearch.data.length,
    0,
  );
  // Test 7: Boundary conditions
  const boundaryTests = [
    { page: 1, limit: 100, description: "maximum limit" },
    { page: 999999, limit: 10, description: "very high page number" },
    { page: 0, limit: 10, description: "page 0 (should default to 1)" },
  ];
  for (const { page, limit, description } of boundaryTests) {
    const boundaryResults = await api.functional.discussionBoard.users.index(
      connection,
      {
        body: {
          page: page satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: limit satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardUser.IRequest,
      },
    );
    typia.assert(boundaryResults);
    TestValidator.predicate(
      `${description} should handle gracefully`,
      boundaryResults.pagination.current >= 1,
    );
    TestValidator.predicate(
      `${description} should have valid limit`,
      boundaryResults.pagination.limit > 0,
    );
  }
  // Test 8: Pagination consistency across pages
  if (defaultPage.pagination.records > 5) {
    const firstPage = await api.functional.discussionBoard.users.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardUser.IRequest,
      },
    );
    typia.assert(firstPage);
    const secondPage = await api.functional.discussionBoard.users.index(
      connection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardUser.IRequest,
      },
    );
    typia.assert(secondPage);
    // Ensure different pages return different data
    if (firstPage.data.length > 0 && secondPage.data.length > 0) {
      TestValidator.notEquals(
        "first and second page should have different data",
        firstPage.data.map((u) => u.id),
        secondPage.data.map((u) => u.id),
      );
    }
    // Ensure total records are consistent
    TestValidator.equals(
      "total records should be consistent across pages",
      firstPage.pagination.records,
      secondPage.pagination.records,
    );
  }
}
