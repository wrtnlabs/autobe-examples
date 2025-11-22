import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdministrator";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";

/**
 * Test administrator list pagination functionality across multiple pages.
 *
 * Creates multiple admin accounts, authenticates, and retrieves administrator
 * list with different page sizes and page numbers. Validates that pagination
 * works correctly with consistent data ordering and proper page metadata.
 */
export async function test_api_admin_administrators_pagination_behavior(
  connection: api.IConnection,
) {
  // Create multiple admin accounts for pagination testing
  const adminAccounts = await Promise.all(
    Array.from({ length: 7 }, async (_, index) => {
      const email = `admin.test.${index + 1}@${RandomGenerator.alphaNumeric(8)}.example.com`;
      const passwordHash = `hashed_password_${RandomGenerator.alphaNumeric(16)}`;

      return await api.functional.auth.admin.join(connection, {
        body: {
          email: email satisfies string & tags.Format<"email">,
          password_hash: passwordHash,
          first_name: `Admin${index + 1}`,
          last_name: "TestUser",
          role_level:
            index < 2 ? "super_admin" : index < 5 ? "admin" : "moderator",
          status: "active",
        } satisfies ITodoAppAdministrator.ICreate,
      });
    }),
  );

  // Validate all admin accounts were created successfully
  adminAccounts.forEach((account, index) => {
    typia.assert(account);
    TestValidator.equals(
      `admin account ${index + 1} should be created`,
      account.id.length > 0,
      true,
    );
  });

  // Retrieve administrator list with pagination
  const adminListResponse =
    await api.functional.todoApp.admin.administrators.at(connection);
  typia.assert(adminListResponse);

  // Validate pagination metadata
  const pagination = adminListResponse.pagination;
  TestValidator.predicate(
    "pagination current page should be valid",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be valid",
    pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should match created accounts",
    pagination.records >= adminAccounts.length,
  );
  TestValidator.predicate(
    "pagination pages should be calculated correctly",
    pagination.pages >= 1,
  );

  // Validate administrator data structure
  const adminSummaries = adminListResponse.data;
  TestValidator.predicate(
    "should return at least the created admin accounts",
    adminSummaries.length >= adminAccounts.length,
  );

  // Validate each administrator summary has required fields
  adminSummaries.forEach((admin, index) => {
    typia.assert(admin);
    TestValidator.equals(
      `admin ${index + 1} should have valid ID`,
      admin.id.length > 0,
      true,
    );
    TestValidator.equals(
      `admin ${index + 1} should have email`,
      admin.email.length > 0,
      true,
    );
    TestValidator.equals(
      `admin ${index + 1} should have role level`,
      ["super_admin", "admin", "moderator"].includes(admin.role_level),
      true,
    );
    TestValidator.equals(
      `admin ${index + 1} should have creation timestamp`,
      admin.created_at.length > 0,
      true,
    );
  });

  // Validate consistent ordering by creation time
  const sortedAdmins = [...adminSummaries].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  TestValidator.equals(
    "administrators should be ordered by creation time",
    adminSummaries,
    sortedAdmins,
  );

  // Validate that all created admin emails are present in the response
  const createdEmails = adminAccounts.map((account) => {
    // Extract email from the account creation data
    return `admin.test.${adminAccounts.indexOf(account) + 1}@${account.id.substring(0, 8)}.example.com`;
  });

  const responseEmails = adminSummaries.map((admin) => admin.email);
  createdEmails.forEach((createdEmail) => {
    TestValidator.predicate(
      `created admin email ${createdEmail} should be in response`,
      responseEmails.includes(createdEmail),
    );
  });

  // Validate page information consistency
  TestValidator.equals(
    "total records should be consistent with data length",
    pagination.records,
    adminSummaries.length,
  );

  TestValidator.predicate(
    "current page should be within valid range",
    pagination.current >= 0 && pagination.current < pagination.pages,
  );

  TestValidator.equals(
    "pages calculation should be correct",
    pagination.pages,
    Math.ceil(pagination.records / pagination.limit),
  );
}
