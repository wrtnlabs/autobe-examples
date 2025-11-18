import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUser";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test user search with full-text search query across email and name fields.
 *
 * This test validates the full-text search functionality by creating users with
 * specific email and name values, then performing various search queries to
 * verify that the search parameter correctly matches against both email and
 * name fields with case-insensitive partial matching.
 *
 * Test Flow:
 *
 * 1. Create first user with distinctive email and name
 * 2. Authenticate as first user to enable search operations
 * 3. Create additional test users with varied emails and names
 * 4. Test search matching email only
 * 5. Test search matching name only
 * 6. Test search matching both fields
 * 7. Test search with no matches
 * 8. Validate pagination and result correctness
 */
export async function test_api_user_search_full_text(
  connection: api.IConnection,
) {
  // Step 1: Create first test user with distinctive email and name
  const firstUserEmail = `alice.wonderland${typia.random<number & tags.Type<"uint32">>()}@example.com`;
  const firstUserName = "Alice Wonderland";

  const firstUser = await api.functional.auth.user.join(connection, {
    body: {
      email: firstUserEmail,
      password: "password123",
      name: firstUserName,
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(firstUser);

  // Step 2: Create second user with different characteristics
  const secondUserEmail = `bob.builder${typia.random<number & tags.Type<"uint32">>()}@test.com`;
  const secondUserName = "Bob Builder";

  const secondUser = await api.functional.auth.user.join(connection, {
    body: {
      email: secondUserEmail,
      password: "password456",
      name: secondUserName,
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(secondUser);

  // Step 3: Create third user with overlapping characteristics
  const thirdUserEmail = `charlie.alice${typia.random<number & tags.Type<"uint32">>()}@domain.org`;
  const thirdUserName = "Charlie Wonder";

  const thirdUser = await api.functional.auth.user.join(connection, {
    body: {
      email: thirdUserEmail,
      password: "password789",
      name: thirdUserName,
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(thirdUser);

  // Step 4: Test search matching email only (search for "wonderland")
  const emailSearchResult = await api.functional.todoList.user.users.index(
    connection,
    {
      body: {
        search: "wonderland",
        page: 1,
        limit: 10,
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(emailSearchResult);

  TestValidator.predicate(
    "search 'wonderland' should find user with email containing 'wonderland'",
    emailSearchResult.data.some((u) => u.id === firstUser.id),
  );

  // Step 5: Test search matching name only (search for "builder")
  const nameSearchResult = await api.functional.todoList.user.users.index(
    connection,
    {
      body: {
        search: "builder",
        page: 1,
        limit: 10,
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(nameSearchResult);

  TestValidator.predicate(
    "search 'builder' should find user with name containing 'Builder'",
    nameSearchResult.data.some((u) => u.id === secondUser.id),
  );

  // Step 6: Test search matching both fields (search for "alice")
  const bothFieldsSearchResult = await api.functional.todoList.user.users.index(
    connection,
    {
      body: {
        search: "alice",
        page: 1,
        limit: 10,
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(bothFieldsSearchResult);

  TestValidator.predicate(
    "search 'alice' should find first user (email match)",
    bothFieldsSearchResult.data.some((u) => u.id === firstUser.id),
  );

  TestValidator.predicate(
    "search 'alice' should find third user (email match)",
    bothFieldsSearchResult.data.some((u) => u.id === thirdUser.id),
  );

  // Step 7: Test case-insensitive matching (search for "WONDER")
  const caseInsensitiveResult = await api.functional.todoList.user.users.index(
    connection,
    {
      body: {
        search: "WONDER",
        page: 1,
        limit: 10,
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(caseInsensitiveResult);

  TestValidator.predicate(
    "search 'WONDER' (uppercase) should match 'Wonderland' and 'Wonder' (case-insensitive)",
    caseInsensitiveResult.data.some((u) => u.id === firstUser.id) &&
      caseInsensitiveResult.data.some((u) => u.id === thirdUser.id),
  );

  // Step 8: Test search with no matches
  const noMatchSearch = await api.functional.todoList.user.users.index(
    connection,
    {
      body: {
        search: "xyz123nonexistent",
        page: 1,
        limit: 10,
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(noMatchSearch);

  TestValidator.equals(
    "search for non-existent term should return zero results",
    noMatchSearch.data.length,
    0,
  );

  // Step 9: Validate pagination metadata for a search with results
  const paginatedSearch = await api.functional.todoList.user.users.index(
    connection,
    {
      body: {
        search: "alice",
        page: 1,
        limit: 5,
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(paginatedSearch);

  TestValidator.predicate(
    "pagination current page should be 1",
    paginatedSearch.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit should be 5",
    paginatedSearch.pagination.limit === 5,
  );

  TestValidator.predicate(
    "search results should have at least 2 matching users",
    paginatedSearch.data.length >= 2,
  );
}
