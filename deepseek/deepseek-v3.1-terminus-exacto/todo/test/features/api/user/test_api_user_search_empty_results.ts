import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUser";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test user search functionality when no results match the search criteria.
 *
 * This test validates that the user search API correctly handles scenarios
 * where no users match the specified search criteria. It performs searches with
 * highly specific or non-matching criteria and verifies that the system returns
 * empty result sets with appropriate pagination metadata.
 *
 * The test ensures that the API handles edge cases gracefully without errors,
 * maintaining proper pagination structure even when no data is found.
 */
export async function test_api_user_search_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testPassword123",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Perform search with highly specific non-matching criteria
  const searchResult1 = await api.functional.todoApp.user.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        search: "xyz123abc789def456", // Highly specific non-matching string
        status: "verified", // Filter by status that doesn't exist
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(searchResult1);

  // Validate empty results with proper pagination
  TestValidator.equals(
    "search with specific criteria returns empty data array",
    searchResult1.data,
    [],
  );
  TestValidator.predicate(
    "pagination records should be 0 for no matches",
    searchResult1.pagination.records === 0,
  );
  TestValidator.predicate(
    "pagination pages should be 0 for no matches",
    searchResult1.pagination.pages === 0,
  );
  TestValidator.predicate(
    "pagination current page should be 1",
    searchResult1.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should match request",
    searchResult1.pagination.limit === 10,
  );

  // Step 3: Test with random alphanumeric search term
  const randomSearchTerm = RandomGenerator.alphaNumeric(20);
  const searchResult2 = await api.functional.todoApp.user.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
        search: randomSearchTerm,
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(searchResult2);

  TestValidator.equals(
    "random search term returns empty data array",
    searchResult2.data,
    [],
  );
  TestValidator.predicate(
    "records should be 0 for random search",
    searchResult2.pagination.records === 0,
  );

  // Step 4: Test with specific status filter that doesn't match any users
  const searchResult3 = await api.functional.todoApp.user.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        status: "suspended", // Status that doesn't exist in current context
        order_by: "name",
        order_direction: "asc",
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(searchResult3);

  TestValidator.equals(
    "status filter with no matches returns empty data",
    searchResult3.data,
    [],
  );
  TestValidator.predicate(
    "pagination should handle status filter correctly",
    searchResult3.pagination.records === 0,
  );

  // Step 5: Test with empty search term but specific status
  const searchResult4 = await api.functional.todoApp.user.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        search: "", // Empty search term
        status: "locked", // Another non-matching status
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(searchResult4);

  TestValidator.equals(
    "empty search with non-matching status returns empty",
    searchResult4.data,
    [],
  );
  TestValidator.predicate(
    "pagination should be consistent",
    searchResult4.pagination.records === 0,
  );

  // Step 6: Test edge case with very specific pattern
  const specificPattern = "user_" + RandomGenerator.alphaNumeric(15) + "_test";
  const searchResult5 = await api.functional.todoApp.user.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
        search: specificPattern,
        order_by: "created_at",
        order_direction: "desc",
      } satisfies ITodoAppUser.IRequest,
    },
  );
  typia.assert(searchResult5);

  TestValidator.equals(
    "specific pattern search returns empty results",
    searchResult5.data,
    [],
  );
  TestValidator.predicate(
    "pagination metadata remains correct",
    searchResult5.pagination.records === 0,
  );
}
