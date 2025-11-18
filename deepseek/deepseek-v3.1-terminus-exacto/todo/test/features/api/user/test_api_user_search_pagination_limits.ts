import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUser";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test user search pagination with various limit values and page numbers.
 *
 * This test validates that the user search API correctly handles pagination
 * parameters including page numbers, limit values, and calculates proper
 * pagination metadata. It creates multiple test users and verifies that
 * pagination works correctly across different scenarios.
 */
export async function test_api_user_search_pagination_limits(
  connection: api.IConnection,
) {
  // Create authenticated user for search operations
  const authUser = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      name: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(authUser);

  // Create multiple test users for pagination testing
  const testUserCount = 15;
  const testUsers = await ArrayUtil.asyncRepeat(
    testUserCount,
    async (index) => {
      const user = await api.functional.auth.user.join(
        { ...connection, headers: {} },
        {
          body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "password123",
            name: `Test User ${index + 1}`,
            href: "https://example.com",
            referrer: "https://example.com",
          } satisfies ITodoAppUser.ICreate,
        },
      );
      typia.assert(user);
      return user;
    },
  );

  // Test pagination with different limit values
  const limitValues = [1, 5, 10, 15, 20] as const;

  for (const limit of limitValues) {
    // Test first page
    const firstPage = await api.functional.todoApp.user.users.index(
      connection,
      {
        body: {
          page: 1,
          limit: limit satisfies number as number,
          search: "",
        } satisfies ITodoAppUser.IRequest,
      },
    );
    typia.assert(firstPage);

    TestValidator.equals(
      `first page current should be 1 with limit ${limit}`,
      firstPage.pagination.current,
      1,
    );
    TestValidator.equals(
      `first page limit should match requested limit ${limit}`,
      firstPage.pagination.limit,
      limit,
    );
    TestValidator.equals(
      `first page total records should match created users with limit ${limit}`,
      firstPage.pagination.records,
      testUserCount + 1, // +1 for auth user
    );
    TestValidator.equals(
      `first page total pages calculation should be correct with limit ${limit}`,
      firstPage.pagination.pages,
      Math.ceil((testUserCount + 1) / limit),
    );
    TestValidator.predicate(
      `first page data length should respect limit ${limit}`,
      firstPage.data.length <= limit,
    );

    // Test last page
    const lastPageNumber = Math.ceil((testUserCount + 1) / limit);
    if (lastPageNumber > 1) {
      const lastPage = await api.functional.todoApp.user.users.index(
        connection,
        {
          body: {
            page: lastPageNumber,
            limit: limit satisfies number as number,
            search: "",
          } satisfies ITodoAppUser.IRequest,
        },
      );
      typia.assert(lastPage);

      TestValidator.equals(
        `last page current should be ${lastPageNumber} with limit ${limit}`,
        lastPage.pagination.current,
        lastPageNumber,
      );
      TestValidator.equals(
        `last page limit should match requested limit ${limit}`,
        lastPage.pagination.limit,
        limit,
      );
      TestValidator.equals(
        `last page total records should match created users with limit ${limit}`,
        lastPage.pagination.records,
        testUserCount + 1,
      );
      TestValidator.predicate(
        `last page data length should be reasonable with limit ${limit}`,
        lastPage.data.length > 0 && lastPage.data.length <= limit,
      );
    }

    // Test page beyond available results
    const beyondPageNumber = lastPageNumber + 1;
    const beyondPage = await api.functional.todoApp.user.users.index(
      connection,
      {
        body: {
          page: beyondPageNumber,
          limit: limit satisfies number as number,
          search: "",
        } satisfies ITodoAppUser.IRequest,
      },
    );
    typia.assert(beyondPage);

    TestValidator.equals(
      `beyond page current should be ${beyondPageNumber} with limit ${limit}`,
      beyondPage.pagination.current,
      beyondPageNumber,
    );
    TestValidator.equals(
      `beyond page should have empty data array with limit ${limit}`,
      beyondPage.data.length,
      0,
    );
    TestValidator.equals(
      `beyond page total records should still match created users with limit ${limit}`,
      beyondPage.pagination.records,
      testUserCount + 1,
    );
  }

  // Test with search term to filter results
  const searchTerm = "Test User";
  const searchPage = await api.functional.todoApp.user.users.index(connection, {
    body: {
      page: 1,
      limit: 10,
      search: searchTerm,
    } satisfies ITodoAppUser.IRequest,
  });
  typia.assert(searchPage);

  TestValidator.predicate(
    "search results should contain users matching search term",
    searchPage.data.length > 0,
  );
  TestValidator.predicate(
    "search results should have users with names containing search term",
    searchPage.data.every((user) => user.name.includes(searchTerm)),
  );
}
