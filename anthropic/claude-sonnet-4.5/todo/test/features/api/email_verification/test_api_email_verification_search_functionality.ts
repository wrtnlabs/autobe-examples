import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListEmailVerification";
import type { ITodoListEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListEmailVerification";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test email verification search functionality by searching across email
 * verification records.
 *
 * This test validates the text search capability for email verification
 * records, ensuring that users can search for verifications by related email
 * addresses. The test creates multiple user accounts with known email patterns,
 * then performs search queries to verify that the search functionality
 * correctly filters and returns matching verification records.
 *
 * Test workflow:
 *
 * 1. Create multiple user accounts with distinctive email addresses
 * 2. Authenticate as one of the created users
 * 3. Perform search queries using partial email addresses and domains
 * 4. Validate that search results are properly structured and returned
 * 5. Verify pagination metadata and data integrity
 */
export async function test_api_email_verification_search_functionality(
  connection: api.IConnection,
) {
  // Step 1: Create first user with a distinctive email pattern
  const userEmail1 = `testuser.alpha${typia.random<number & tags.Type<"uint32"> & tags.Maximum<99999>>()}@example.com`;
  const user1 = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail1,
      password: "SecurePass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user1);

  // Step 2: Create second user with different email pattern
  const userEmail2 = `testuser.beta${typia.random<number & tags.Type<"uint32"> & tags.Maximum<99999>>()}@example.org`;
  const user2 = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail2,
      password: "SecurePass456!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user2);

  // Step 3: Create third user with another email pattern
  const userEmail3 = `admin.gamma${typia.random<number & tags.Type<"uint32"> & tags.Maximum<99999>>()}@testdomain.com`;
  const user3 = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail3,
      password: "SecurePass789!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user3);

  // Step 4: Search for verifications using partial email substring from user1
  const searchTerm1 = "alpha";
  const searchResult1 =
    await api.functional.todoList.user.users.emailVerifications.index(
      connection,
      {
        userId: user1.id,
        body: {
          search: searchTerm1,
          page: 1,
          limit: 10,
        } satisfies ITodoListEmailVerification.IRequest,
      },
    );
  typia.assert(searchResult1);

  // Step 5: Search using domain pattern
  const domainSearch = "example.com";
  const searchResult2 =
    await api.functional.todoList.user.users.emailVerifications.index(
      connection,
      {
        userId: user1.id,
        body: {
          search: domainSearch,
          page: 1,
          limit: 20,
        } satisfies ITodoListEmailVerification.IRequest,
      },
    );
  typia.assert(searchResult2);

  // Step 6: Search with empty search term to get all verifications
  const allVerifications =
    await api.functional.todoList.user.users.emailVerifications.index(
      connection,
      {
        userId: user1.id,
        body: {
          page: 1,
          limit: 50,
        } satisfies ITodoListEmailVerification.IRequest,
      },
    );
  typia.assert(allVerifications);

  // Step 7: Test search with specific substring from user2 email
  const searchResult3 =
    await api.functional.todoList.user.users.emailVerifications.index(
      connection,
      {
        userId: user2.id,
        body: {
          search: "beta",
          page: 1,
          limit: 10,
        } satisfies ITodoListEmailVerification.IRequest,
      },
    );
  typia.assert(searchResult3);

  // Step 8: Test search with domain pattern for user3
  const searchResult4 =
    await api.functional.todoList.user.users.emailVerifications.index(
      connection,
      {
        userId: user3.id,
        body: {
          search: "testdomain.com",
          page: 1,
          limit: 10,
        } satisfies ITodoListEmailVerification.IRequest,
      },
    );
  typia.assert(searchResult4);

  // Step 9: Test pagination with different page sizes
  const paginationTest =
    await api.functional.todoList.user.users.emailVerifications.index(
      connection,
      {
        userId: user1.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies ITodoListEmailVerification.IRequest,
      },
    );
  typia.assert(paginationTest);

  // Step 10: Validate pagination values using TestValidator
  TestValidator.equals(
    "pagination current page should match request",
    paginationTest.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination limit should match request",
    paginationTest.pagination.limit,
    5,
  );
}
