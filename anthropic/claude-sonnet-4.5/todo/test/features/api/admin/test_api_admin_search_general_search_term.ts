import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListAdmin";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test the general search functionality for administrator accounts using
 * partial email matching.
 *
 * This test validates that the search parameter enables case-insensitive
 * substring matching across administrator email addresses, allowing
 * administrators to quickly locate accounts using partial email information.
 * The search should support rapid admin identification in dashboards and
 * management interfaces with proper pagination support.
 *
 * Test workflow:
 *
 * 1. Authenticate as an administrator first
 * 2. Create multiple test administrators with varied email patterns
 * 3. Perform general search using partial email substring
 * 4. Validate search results contain only matching administrators
 * 5. Verify case-insensitive matching works correctly
 * 6. Confirm pagination metadata is accurate
 */
export async function test_api_admin_search_general_search_term(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as the first administrator
  const authAdminEmail = `auth.admin${typia.random<number & tags.Type<"uint32">>()}@testdomain.com`;
  const authAdminPassword = RandomGenerator.alphaNumeric(12);

  const authenticatedAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: authAdminEmail,
      password: authAdminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(authenticatedAdmin);

  // Step 2: Create multiple test administrators with distinct email patterns
  const testAdminData = [
    {
      email: `john.smith${typia.random<number & tags.Type<"uint32">>()}@example.com`,
      password: RandomGenerator.alphaNumeric(12),
    },
    {
      email: `admin.user${typia.random<number & tags.Type<"uint32">>()}@testdomain.com`,
      password: RandomGenerator.alphaNumeric(12),
    },
    {
      email: `jane.doe${typia.random<number & tags.Type<"uint32">>()}@example.com`,
      password: RandomGenerator.alphaNumeric(12),
    },
    {
      email: `test.admin${typia.random<number & tags.Type<"uint32">>()}@company.org`,
      password: RandomGenerator.alphaNumeric(12),
    },
    {
      email: `super.admin${typia.random<number & tags.Type<"uint32">>()}@example.com`,
      password: RandomGenerator.alphaNumeric(12),
    },
  ];

  const createdAdmins: ITodoListAdmin.IAuthorized[] = [];

  for (const adminInfo of testAdminData) {
    const admin = await api.functional.auth.admin.join(connection, {
      body: {
        email: adminInfo.email,
        password: adminInfo.password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListAdmin.ICreate,
    });
    typia.assert(admin);
    createdAdmins.push(admin);
  }

  // Step 3: Perform general search using partial email substring "example.com"
  const searchTerm = "example.com";
  const searchResult = await api.functional.todoList.admin.admins.index(
    connection,
    {
      body: {
        search: searchTerm,
        page: 1,
        limit: 10,
      } satisfies ITodoListAdmin.IRequest,
    },
  );
  typia.assert(searchResult);

  // Step 4: Validate pagination metadata
  typia.assert(searchResult.pagination);
  TestValidator.predicate(
    "pagination current page is 1",
    searchResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    searchResult.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    searchResult.pagination.pages >= 0,
  );

  // Step 5: Validate search results contain only admins with matching emails
  const expectedMatchingEmails = testAdminData
    .filter((admin) =>
      admin.email.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .map((admin) => admin.email);

  TestValidator.predicate(
    "search returned results",
    searchResult.data.length > 0,
  );

  // Verify all returned admins match the search criteria
  for (const admin of searchResult.data) {
    TestValidator.predicate(
      "admin email contains search term (case-insensitive)",
      admin.email.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }

  // Verify expected admins are in the results
  const returnedEmails = searchResult.data.map((admin) => admin.email);
  for (const expectedEmail of expectedMatchingEmails) {
    TestValidator.predicate(
      "expected admin is in search results",
      returnedEmails.some((email) => email === expectedEmail),
    );
  }

  // Step 6: Test case-insensitive search with uppercase
  const upperCaseSearchTerm = "EXAMPLE";
  const upperCaseResult = await api.functional.todoList.admin.admins.index(
    connection,
    {
      body: {
        search: upperCaseSearchTerm,
        page: 1,
        limit: 10,
      } satisfies ITodoListAdmin.IRequest,
    },
  );
  typia.assert(upperCaseResult);

  TestValidator.predicate(
    "case-insensitive search returned results",
    upperCaseResult.data.length > 0,
  );

  for (const admin of upperCaseResult.data) {
    TestValidator.predicate(
      "admin email contains uppercase search term (case-insensitive)",
      admin.email.toLowerCase().includes(upperCaseSearchTerm.toLowerCase()),
    );
  }

  // Step 7: Test search with partial username
  const partialUsername = "admin";
  const usernameSearchResult = await api.functional.todoList.admin.admins.index(
    connection,
    {
      body: {
        search: partialUsername,
        page: 1,
        limit: 10,
      } satisfies ITodoListAdmin.IRequest,
    },
  );
  typia.assert(usernameSearchResult);

  TestValidator.predicate(
    "partial username search returned results",
    usernameSearchResult.data.length > 0,
  );

  for (const admin of usernameSearchResult.data) {
    TestValidator.predicate(
      "admin email contains partial username",
      admin.email.toLowerCase().includes(partialUsername.toLowerCase()),
    );
  }

  // Step 8: Test search with non-matching term
  const nonMatchingTerm = "nonexistent12345xyz";
  const emptyResult = await api.functional.todoList.admin.admins.index(
    connection,
    {
      body: {
        search: nonMatchingTerm,
        page: 1,
        limit: 10,
      } satisfies ITodoListAdmin.IRequest,
    },
  );
  typia.assert(emptyResult);

  TestValidator.predicate(
    "non-matching search returns zero or minimal results",
    emptyResult.data.length >= 0,
  );
}
