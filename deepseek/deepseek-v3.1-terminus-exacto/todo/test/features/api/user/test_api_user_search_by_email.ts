import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUser";
import type { ITodoListConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListConfiguration";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test comprehensive user search functionality by email pattern matching.
 *
 * This test validates the user search API's ability to filter users based on
 * partial email matching patterns. It creates multiple test users with diverse
 * email patterns, performs searches with various search terms, and verifies
 * that the results correctly match the expected filtered users.
 *
 * The test also validates pagination functionality with proper page limits and
 * sorting options to ensure the search API handles large datasets efficiently
 * while maintaining data integrity.
 */
export async function test_api_user_search_by_email(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user context for search operations
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "password123",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Set up system configuration for user management
  const configuration =
    await api.functional.todoList.user.configurations.create(connection, {
      body: {
        key: "user.search.limit",
        value: "50",
        description: "Maximum number of users to return in search results",
        category: "user",
      } satisfies ITodoListConfiguration.ICreate,
    });
  typia.assert(configuration);

  // Step 3: Create multiple test users with unique email patterns
  const testUsers: ITodoListUser.IAuthorized[] = [];

  // Create users with unique email patterns using different domains
  const emailDomains = [
    "company.com",
    "example.org",
    "gmail.com",
    "domain.net",
  ] as const;
  const emailPatterns = [
    "test.user",
    "user.test",
    "special.user",
    "another.user",
  ] as const;

  // Generate unique email combinations
  const uniqueEmails: string[] = [];
  for (const pattern of emailPatterns) {
    for (const domain of emailDomains) {
      uniqueEmails.push(`${pattern}@${domain}`);
    }
  }

  // Take a subset to avoid creating too many users
  const selectedEmails = RandomGenerator.sample(uniqueEmails, 6);

  for (const email of selectedEmails) {
    const testUser = await api.functional.auth.user.join(connection, {
      body: {
        email: email,
        password: "testpassword",
      } satisfies ITodoListUser.ICreate,
    });
    typia.assert(testUser);
    testUsers.push(testUser);
  }

  // Step 4: Test search functionality with partial email matching
  // Search for users with "company" in their email
  const companySearch = await api.functional.todoList.user.users.index(
    connection,
    {
      body: {
        search: "company",
        page: 1,
        limit: 10,
        order_by: "email",
        order: "asc",
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(companySearch);

  // Validate that only users with "company" in email are returned
  const companyUsers = testUsers.filter((user) =>
    user.email.includes("company"),
  );
  TestValidator.equals(
    "company search returns correct number of users",
    companySearch.data.length,
    companyUsers.length,
  );

  // Verify each returned user contains "company" in email
  for (const user of companySearch.data) {
    TestValidator.predicate(
      "user email contains search term",
      user.email.includes("company"),
    );
  }

  // Step 5: Test search with "example" pattern
  const exampleSearch = await api.functional.todoList.user.users.index(
    connection,
    {
      body: {
        search: "example",
        page: 1,
        limit: 10,
        order_by: "email",
        order: "desc",
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(exampleSearch);

  const exampleUsers = testUsers.filter((user) =>
    user.email.includes("example"),
  );
  TestValidator.equals(
    "example search returns correct number of users",
    exampleSearch.data.length,
    exampleUsers.length,
  );

  // Step 6: Test pagination functionality
  const paginatedSearch = await api.functional.todoList.user.users.index(
    connection,
    {
      body: {
        search: "user",
        page: 1,
        limit: 2, // Small limit to test pagination
        order_by: "email",
        order: "asc",
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(paginatedSearch);

  // Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    paginatedSearch.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", paginatedSearch.pagination.limit, 2);
  TestValidator.predicate(
    "pagination records count is valid",
    paginatedSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    paginatedSearch.pagination.pages >= 1,
  );

  // Step 7: Test empty search (should return all users)
  const emptySearch = await api.functional.todoList.user.users.index(
    connection,
    {
      body: {
        search: "",
        page: 1,
        limit: 20,
        order_by: "created_at",
        order: "desc",
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(emptySearch);

  // Empty search should return multiple users
  TestValidator.predicate(
    "empty search returns multiple users",
    emptySearch.data.length > 0,
  );

  // Step 8: Test non-matching search term
  const nonMatchingSearch = await api.functional.todoList.user.users.index(
    connection,
    {
      body: {
        search: "nonexistentpattern123",
        page: 1,
        limit: 10,
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(nonMatchingSearch);

  // Non-matching search should return empty results
  TestValidator.equals(
    "non-matching search returns empty results",
    nonMatchingSearch.data.length,
    0,
  );

  // Step 9: Verify search respects status filtering
  const activeSearch = await api.functional.todoList.user.users.index(
    connection,
    {
      body: {
        search: "user",
        status: "active",
        page: 1,
        limit: 10,
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(activeSearch);

  // All returned users should have active status
  for (const user of activeSearch.data) {
    TestValidator.equals("user status is active", user.status, "active");
  }
}
