import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdministrator";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";

/**
 * Test administrator search functionality using email-based filtering.
 *
 * This test validates the email-based search capabilities for admin accounts,
 * ensuring that administrators can be correctly filtered and identified using
 * their email addresses. The test creates multiple admin accounts with
 * different email domains, authenticates as an admin, and performs various
 * email-based search operations to verify the search functionality works as
 * expected.
 *
 * Test scenarios include:
 *
 * 1. Creating admin accounts with diverse email domains
 * 2. Authenticating as admin user
 * 3. Searching by exact email address
 * 4. Validating search results match expected criteria
 * 5. Testing email-based filtering accuracy
 */
export async function test_api_admin_administrators_search_by_email_domain(
  connection: api.IConnection,
) {
  // Step 1: Create multiple admin accounts with different email domains
  const admin1 = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: typia.random<string>(),
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role_level: "admin",
      status: "active",
    } satisfies ITodoAppAdministrator.ICreate,
  });
  typia.assert(admin1);

  const admin2 = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: typia.random<string>(),
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role_level: "moderator",
      status: "active",
    } satisfies ITodoAppAdministrator.ICreate,
  });
  typia.assert(admin2);

  const admin3 = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: typia.random<string>(),
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role_level: "super_admin",
      status: "active",
    } satisfies ITodoAppAdministrator.ICreate,
  });
  typia.assert(admin3);

  // Step 2: Create an additional admin with a specific domain for targeted testing
  const testDomainAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: "testuser@company.com",
      password_hash: typia.random<string>(),
      first_name: "Test",
      last_name: "User",
      role_level: "admin",
      status: "active",
    } satisfies ITodoAppAdministrator.ICreate,
  });
  typia.assert(testDomainAdmin);

  // Step 3: Test basic administrator search (should return all created admins)
  const allAdminsSearch =
    await api.functional.todoApp.admin.administrators.index(connection, {
      body: {
        page: 1,
        limit: 10,
        order_by: "email",
        order_direction: "asc",
      } satisfies ITodoAppAdministrator.IRequest,
    });
  typia.assert(allAdminsSearch);

  // Validate that we can find all created administrators
  TestValidator.equals(
    "should find all created administrators",
    allAdminsSearch.data.length,
    4,
  );

  // Step 4: Test exact email search for the specific test domain admin
  const exactEmailSearch =
    await api.functional.todoApp.admin.administrators.index(connection, {
      body: {
        page: 1,
        limit: 10,
        email: "testuser@company.com",
      } satisfies ITodoAppAdministrator.IRequest,
    });
  typia.assert(exactEmailSearch);

  // Should find exactly one admin with the specified email
  TestValidator.equals(
    "should find exact email match",
    exactEmailSearch.data.length,
    1,
  );
  TestValidator.equals(
    "found admin email should match search query",
    exactEmailSearch.data[0].email,
    "testuser@company.com",
  );

  // Step 5: Test domain-based search by extracting domain and testing partial match
  const companyDomain = "testuser@company.com".split("@")[1];
  const partialEmailSearch =
    await api.functional.todoApp.admin.administrators.index(connection, {
      body: {
        page: 1,
        limit: 10,
        search: `*@${companyDomain}`,
      } satisfies ITodoAppAdministrator.IRequest,
    });
  typia.assert(partialEmailSearch);

  // Should find the admin with the company domain
  TestValidator.predicate("should find admin with matching domain", () => {
    const found = partialEmailSearch.data.some((admin) =>
      admin.email.includes(`@${companyDomain}`),
    );
    return found;
  });

  // Step 6: Test search with non-existent email (should return empty or filtered results)
  const nonExistentEmailSearch =
    await api.functional.todoApp.admin.administrators.index(connection, {
      body: {
        page: 1,
        limit: 10,
        email: "nonexistent@doesnotexist.com",
      } satisfies ITodoAppAdministrator.IRequest,
    });
  typia.assert(nonExistentEmailSearch);

  // Should not find any admin with the non-existent email
  TestValidator.equals(
    "should not find non-existent email",
    nonExistentEmailSearch.data.length,
    0,
  );

  // Step 7: Test search with partial email match
  const partialMatchSearch =
    await api.functional.todoApp.admin.administrators.index(connection, {
      body: {
        page: 1,
        limit: 10,
        search: "testuser",
      } satisfies ITodoAppAdministrator.IRequest,
    });
  typia.assert(partialMatchSearch);

  // Should find the admin with "testuser" in their email
  TestValidator.predicate("should find partial email match", () => {
    const found = partialMatchSearch.data.some((admin) =>
      admin.email.includes("testuser"),
    );
    return found;
  });

  // Step 8: Verify that search results contain expected admin data structure
  if (allAdminsSearch.data.length > 0) {
    const firstAdmin = allAdminsSearch.data[0];
    TestValidator.equals(
      "admin should have required fields",
      firstAdmin.email !== undefined &&
        firstAdmin.first_name !== undefined &&
        firstAdmin.last_name !== undefined &&
        firstAdmin.role_level !== undefined,
      true,
    );
  }
}
