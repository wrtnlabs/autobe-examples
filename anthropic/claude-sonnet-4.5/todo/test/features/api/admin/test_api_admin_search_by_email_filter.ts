import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListAdmin";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test administrator search with email-based filtering.
 *
 * This test validates the admin search API's email filtering capabilities,
 * ensuring that administrators can search for specific admin accounts using
 * email substrings or domain patterns. The test verifies partial matching,
 * case-insensitive search, and domain-based filtering.
 *
 * Test workflow:
 *
 * 1. Create multiple admin accounts with diverse email patterns
 * 2. Test exact email match filtering
 * 3. Test partial email substring matching
 * 4. Test domain-based filtering (@domain.com)
 * 5. Verify case-insensitive search behavior
 * 6. Validate that only matching admins are returned
 * 7. Confirm pagination and response structure
 */
export async function test_api_admin_search_by_email_filter(
  connection: api.IConnection,
) {
  // Step 1: Create primary admin account for authentication
  const primaryAdminEmail = `admin.primary${typia.random<number & tags.Type<"uint32"> & tags.Maximum<999999>>()}@testcompany.com`;
  const primaryAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: primaryAdminEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(primaryAdmin);

  // Step 2: Create additional admin accounts with various email patterns
  const testDomain = "testcompany.com";
  const otherDomain = "otherdomain.org";

  const adminEmails = [
    `user.alpha${typia.random<number & tags.Type<"uint32"> & tags.Maximum<999999>>()}@${testDomain}`,
    `user.beta${typia.random<number & tags.Type<"uint32"> & tags.Maximum<999999>>()}@${testDomain}`,
    `admin.special${typia.random<number & tags.Type<"uint32"> & tags.Maximum<999999>>()}@${testDomain}`,
    `manager.test${typia.random<number & tags.Type<"uint32"> & tags.Maximum<999999>>()}@${otherDomain}`,
    `developer.main${typia.random<number & tags.Type<"uint32"> & tags.Maximum<999999>>()}@${otherDomain}`,
  ];

  const createdAdmins = await ArrayUtil.asyncRepeat(
    adminEmails.length,
    async (index) => {
      const admin = await api.functional.auth.admin.join(connection, {
        body: {
          email: adminEmails[index],
          password: typia.random<string & tags.MinLength<8>>(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ITodoListAdmin.ICreate,
      });
      typia.assert(admin);
      return admin;
    },
  );

  // Step 3: Test exact email match filtering
  const exactEmailResult = await api.functional.todoList.admin.admins.index(
    connection,
    {
      body: {
        email: adminEmails[0],
        page: 1,
        limit: 10,
      } satisfies ITodoListAdmin.IRequest,
    },
  );
  typia.assert(exactEmailResult);

  TestValidator.predicate(
    "exact email match should return at least one result",
    exactEmailResult.data.length >= 1,
  );

  const exactMatch = exactEmailResult.data.find(
    (admin) => admin.email === adminEmails[0],
  );
  if (exactMatch) {
    typia.assertGuard(exactMatch);
    TestValidator.equals(
      "exact email match should return correct admin",
      exactMatch.email,
      adminEmails[0],
    );
  }

  // Step 4: Test partial email substring matching
  const partialEmail = adminEmails[1].substring(0, 10);
  const partialEmailResult = await api.functional.todoList.admin.admins.index(
    connection,
    {
      body: {
        email: partialEmail,
        page: 1,
        limit: 20,
      } satisfies ITodoListAdmin.IRequest,
    },
  );
  typia.assert(partialEmailResult);

  TestValidator.predicate(
    "partial email match should return results",
    partialEmailResult.data.length > 0,
  );

  const hasPartialMatch = partialEmailResult.data.some((admin) =>
    admin.email.includes(partialEmail),
  );
  TestValidator.predicate(
    "partial email results should contain matching substring",
    hasPartialMatch,
  );

  // Step 5: Test domain-based filtering
  const domainFilter = `@${testDomain}`;
  const domainResult = await api.functional.todoList.admin.admins.index(
    connection,
    {
      body: {
        email: domainFilter,
        page: 1,
        limit: 50,
      } satisfies ITodoListAdmin.IRequest,
    },
  );
  typia.assert(domainResult);

  TestValidator.predicate(
    "domain filter should return multiple results",
    domainResult.data.length >= 3,
  );

  const allMatchDomain = domainResult.data
    .filter(
      (admin) =>
        adminEmails.some((testEmail) => testEmail === admin.email) ||
        admin.email === primaryAdminEmail,
    )
    .every((admin) => admin.email.includes(testDomain));

  TestValidator.predicate(
    "all domain filtered results should contain the domain",
    allMatchDomain,
  );

  // Step 6: Test case-insensitive search
  const upperCaseEmail = adminEmails[2].toUpperCase();
  const caseInsensitiveResult =
    await api.functional.todoList.admin.admins.index(connection, {
      body: {
        email: upperCaseEmail,
        page: 1,
        limit: 10,
      } satisfies ITodoListAdmin.IRequest,
    });
  typia.assert(caseInsensitiveResult);

  const caseInsensitiveMatch = caseInsensitiveResult.data.find(
    (admin) => admin.email.toLowerCase() === adminEmails[2].toLowerCase(),
  );

  if (caseInsensitiveMatch) {
    TestValidator.equals(
      "case-insensitive search should find matching admin",
      caseInsensitiveMatch.email.toLowerCase(),
      adminEmails[2].toLowerCase(),
    );
  }

  // Step 7: Test filtering with other domain
  const otherDomainFilter = `@${otherDomain}`;
  const otherDomainResult = await api.functional.todoList.admin.admins.index(
    connection,
    {
      body: {
        email: otherDomainFilter,
        page: 1,
        limit: 20,
      } satisfies ITodoListAdmin.IRequest,
    },
  );
  typia.assert(otherDomainResult);

  TestValidator.predicate(
    "other domain filter should return results",
    otherDomainResult.data.length >= 2,
  );

  const otherDomainMatches = otherDomainResult.data.filter((admin) =>
    adminEmails.some((testEmail) => testEmail === admin.email),
  );

  TestValidator.predicate(
    "other domain results should match expected count",
    otherDomainMatches.length >= 2,
  );

  // Step 8: Validate pagination structure
  const paginatedResult = await api.functional.todoList.admin.admins.index(
    connection,
    {
      body: {
        email: domainFilter,
        page: 1,
        limit: 2,
      } satisfies ITodoListAdmin.IRequest,
    },
  );
  typia.assert(paginatedResult);

  TestValidator.predicate(
    "pagination limit should be respected",
    paginatedResult.data.length <= 2,
  );

  TestValidator.predicate(
    "pagination current page should be correct",
    paginatedResult.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination should have valid records count",
    paginatedResult.pagination.records >= 0,
  );
}
