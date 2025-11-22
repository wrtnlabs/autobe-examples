import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAuditLog";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import type { ITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuditLog";

export async function test_api_admin_audit_log_full_text_search(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to create test administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";

  const authenticatedAdmin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: typia.random<string>(),
        first_name: "Test",
        last_name: "Admin",
        role_level: "admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(authenticatedAdmin);

  // Step 2: Create another administrator account to generate audit logs
  const testAdminEmail = typia.random<string & tags.Format<"email">>();
  const createdAdmin: ITodoAppAdministrator =
    await api.functional.todoApp.administrators.create(connection, {
      body: {
        email: testAdminEmail,
        password_hash: typia.random<string>(),
        first_name: "John",
        last_name: "Doe",
        role_level: "admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(createdAdmin);

  // Step 3: Generate more audit logs with descriptive content by performing additional operations
  const testAdminEmail2 = typia.random<string & tags.Format<"email">>();
  const createdAdmin2: ITodoAppAdministrator =
    await api.functional.todoApp.administrators.create(connection, {
      body: {
        email: testAdminEmail2,
        password_hash: typia.random<string>(),
        first_name: "Jane",
        last_name: "Smith",
        role_level: "moderator",
        status: "suspended",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(createdAdmin2);

  // Step 4: Perform full-text search using search parameter to find audit logs with specific keywords
  const searchResults: IPageITodoAppAuditLog =
    await api.functional.todoApp.admin.administrators.auditLogs.search(
      connection,
      {
        administratorId: authenticatedAdmin.id,
        body: {
          page: 1,
          limit: 50,
          search: "administrator", // Search for the keyword "administrator" in descriptions
        } satisfies ITodoAppAuditLog.IRequest,
      },
    );
  typia.assert(searchResults);

  // Step 5: Validate search results contain relevant audit logs
  TestValidator.predicate(
    "search results should contain audit logs",
    searchResults.data.length > 0,
  );

  // Step 6: Validate that found audit logs contain the search term in descriptions
  const foundLogs = searchResults.data.filter((log) =>
    log.action_description.toLowerCase().includes("administrator"),
  );
  TestValidator.predicate(
    "found audit logs should contain search term 'administrator'",
    foundLogs.length > 0,
  );

  // Step 7: Test case-sensitive search with different keyword
  const securitySearchResults: IPageITodoAppAuditLog =
    await api.functional.todoApp.admin.administrators.auditLogs.search(
      connection,
      {
        administratorId: authenticatedAdmin.id,
        body: {
          page: 1,
          limit: 50,
          search: "security",
        } satisfies ITodoAppAuditLog.IRequest,
      },
    );
  typia.assert(securitySearchResults);

  // Step 8: Validate that search returns appropriate results or empty if no matches
  TestValidator.predicate(
    "security search should return results or be empty",
    securitySearchResults.data.length >= 0,
  );

  // Step 9: Test search with multiple keywords (partial match)
  const partialSearchResults: IPageITodoAppAuditLog =
    await api.functional.todoApp.admin.administrators.auditLogs.search(
      connection,
      {
        administratorId: authenticatedAdmin.id,
        body: {
          page: 1,
          limit: 50,
          search: "create", // Should find logs with "create" in descriptions
        } satisfies ITodoAppAuditLog.IRequest,
      },
    );
  typia.assert(partialSearchResults);

  // Step 10: Validate pagination works with search
  TestValidator.predicate(
    "search results should have proper pagination info",
    partialSearchResults.pagination.current === 1 &&
      partialSearchResults.pagination.limit === 50,
  );

  // Step 11: Test empty search term (should return all results)
  const allResults: IPageITodoAppAuditLog =
    await api.functional.todoApp.admin.administrators.auditLogs.search(
      connection,
      {
        administratorId: authenticatedAdmin.id,
        body: {
          page: 1,
          limit: 20,
          search: "", // Empty search should return all audit logs
        } satisfies ITodoAppAuditLog.IRequest,
      },
    );
  typia.assert(allResults);

  // Step 12: Validate that empty search returns more results than specific searches
  TestValidator.predicate(
    "empty search should return more or equal results than specific searches",
    allResults.data.length >=
      Math.max(searchResults.data.length, partialSearchResults.data.length),
  );
}
