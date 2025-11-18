import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUser";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test user search with email address filtering.
 *
 * This test validates the email filter functionality of the user search API. It
 * creates multiple user accounts with distinct email addresses and performs
 * search queries to verify that the email filter correctly returns users
 * matching the provided exact email address.
 *
 * Note: The email filter parameter requires a valid email format
 * (tags.Format<"email">), so this test focuses on exact email matching rather
 * than partial pattern matching.
 *
 * Test workflow:
 *
 * 1. Register multiple users with different email addresses
 * 2. Search by exact email address and verify correct user is returned
 * 3. Search with another exact email address
 * 4. Search with non-existent email and verify empty results
 * 5. Validate pagination structure in responses
 */
export async function test_api_user_search_email_filter(
  connection: api.IConnection,
) {
  // Step 1: Create test users with distinct email patterns
  const testEmail1 = `testuser1${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<9999>>()}@example.com`;
  const testEmail2 = `testuser2${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<9999>>()}@example.com`;
  const testEmail3 = `admin${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<9999>>()}@testdomain.org`;
  const testEmail4 = `special.user${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<9999>>()}@example.com`;

  const baseHref = `https://test.example.com/register`;
  const baseReferrer = `https://test.example.com/home`;

  // Create first user
  const user1 = await api.functional.auth.user.join(connection, {
    body: {
      email: testEmail1,
      password: "SecurePass123!",
      name: "Test User One",
      href: baseHref,
      referrer: baseReferrer,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user1);

  // Create second user
  const user2 = await api.functional.auth.user.join(connection, {
    body: {
      email: testEmail2,
      password: "SecurePass123!",
      name: "Test User Two",
      href: baseHref,
      referrer: baseReferrer,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user2);

  // Create third user with different domain
  const user3 = await api.functional.auth.user.join(connection, {
    body: {
      email: testEmail3,
      password: "SecurePass123!",
      name: "Admin User",
      href: baseHref,
      referrer: baseReferrer,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user3);

  // Create fourth user with special characters
  const user4 = await api.functional.auth.user.join(connection, {
    body: {
      email: testEmail4,
      password: "SecurePass123!",
      name: "Special User",
      href: baseHref,
      referrer: baseReferrer,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user4);

  // Step 2: Search by exact email address - first user
  const exactMatchResult1 = await api.functional.todoList.user.users.index(
    connection,
    {
      body: {
        email: testEmail1,
        page: 1,
        limit: 10,
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(exactMatchResult1);

  TestValidator.predicate(
    "exact email match should return at least one result",
    exactMatchResult1.data.length >= 1,
  );

  const foundUser1 = exactMatchResult1.data.find((u) => u.email === testEmail1);
  typia.assertGuard(foundUser1!);

  TestValidator.equals(
    "found user email matches search email",
    foundUser1.email,
    testEmail1,
  );

  TestValidator.equals(
    "found user name matches created user",
    foundUser1.name,
    "Test User One",
  );

  // Step 3: Search by exact email address - second user
  const exactMatchResult2 = await api.functional.todoList.user.users.index(
    connection,
    {
      body: {
        email: testEmail2,
        page: 1,
        limit: 10,
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(exactMatchResult2);

  TestValidator.predicate(
    "second exact email match should return results",
    exactMatchResult2.data.length >= 1,
  );

  const foundUser2 = exactMatchResult2.data.find((u) => u.email === testEmail2);
  typia.assertGuard(foundUser2!);

  TestValidator.equals(
    "second found user email matches search",
    foundUser2.email,
    testEmail2,
  );

  // Step 4: Search by exact email address - third user (different domain)
  const exactMatchResult3 = await api.functional.todoList.user.users.index(
    connection,
    {
      body: {
        email: testEmail3,
        page: 1,
        limit: 10,
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(exactMatchResult3);

  const foundUser3 = exactMatchResult3.data.find((u) => u.email === testEmail3);
  typia.assertGuard(foundUser3!);

  TestValidator.equals(
    "third user from different domain found correctly",
    foundUser3.email,
    testEmail3,
  );

  // Step 5: Search with non-existent email pattern
  const noResultsSearch = await api.functional.todoList.user.users.index(
    connection,
    {
      body: {
        email: `nonexistent${typia.random<number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>>()}@nodomain.xyz`,
        page: 1,
        limit: 10,
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(noResultsSearch);

  TestValidator.equals(
    "search with non-existent email should return empty results",
    noResultsSearch.data.length,
    0,
  );

  // Step 6: Validate pagination structure
  TestValidator.predicate(
    "pagination object should exist",
    exactMatchResult1.pagination !== null &&
      exactMatchResult1.pagination !== undefined,
  );

  TestValidator.predicate(
    "pagination current page should be non-negative",
    exactMatchResult1.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit should be positive",
    exactMatchResult1.pagination.limit > 0,
  );

  TestValidator.predicate(
    "pagination records should be non-negative",
    exactMatchResult1.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination pages should be non-negative",
    exactMatchResult1.pagination.pages >= 0,
  );

  // Step 7: Search without email filter to verify basic functionality
  const allUsersResult = await api.functional.todoList.user.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 50,
      } satisfies ITodoListUser.IRequest,
    },
  );
  typia.assert(allUsersResult);

  TestValidator.predicate(
    "search without filter should return multiple users",
    allUsersResult.data.length >= 4,
  );

  const allCreatedUsers = allUsersResult.data.filter(
    (u) =>
      u.email === testEmail1 ||
      u.email === testEmail2 ||
      u.email === testEmail3 ||
      u.email === testEmail4,
  );

  TestValidator.predicate(
    "all created test users should be findable in unfiltered search",
    allCreatedUsers.length >= 4,
  );
}
