import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAuditLog";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import type { ITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuditLog";

export async function test_api_admin_audit_logs_empty_search_results(
  connection: api.IConnection,
) {
  // 1. Create admin account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password_hash: "admin123",
      first_name: "Test",
      last_name: "Admin",
      role_level: "admin",
      status: "active",
    } satisfies ITodoAppAdministrator.ICreate,
  });
  typia.assert(admin);

  // 2. Test empty search results with future date range (no audit activity expected)
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);

  const emptySearchResults =
    await api.functional.todoApp.admin.system.auditLogs.patch(connection, {
      body: {
        page: 1,
        limit: 20,
        created_after: futureDate.toISOString(),
        created_before: futureDate.toISOString(),
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(emptySearchResults);

  // 3. Validate empty results structure and pagination metadata
  TestValidator.equals(
    "data array should be empty for future date search",
    emptySearchResults.data.length,
    0,
  );

  TestValidator.equals(
    "pagination records should be 0 for empty results",
    emptySearchResults.pagination.records,
    0,
  );

  TestValidator.equals(
    "current page should be 1",
    emptySearchResults.pagination.current,
    1,
  );

  TestValidator.equals(
    "total pages should be 0 for empty results",
    emptySearchResults.pagination.pages,
    0,
  );

  TestValidator.equals(
    "limit should match request",
    emptySearchResults.pagination.limit,
    20,
  );

  // 4. Test another empty search scenario with non-existent action type
  const noActionResults =
    await api.functional.todoApp.admin.system.auditLogs.patch(connection, {
      body: {
        page: 1,
        limit: 10,
        action_type: "non_existent_action_12345",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(noActionResults);

  TestValidator.equals(
    "data array should be empty for non-existent action type",
    noActionResults.data.length,
    0,
  );

  TestValidator.equals(
    "pagination records should be 0 for action type search",
    noActionResults.pagination.records,
    0,
  );

  // 5. Test complex empty search with multiple criteria
  const complexEmptySearch =
    await api.functional.todoApp.admin.system.auditLogs.patch(connection, {
      body: {
        page: 1,
        limit: 15,
        action_type: "unknown_action",
        severity_level: "critical",
        actor_administrator_id: "00000000-0000-0000-0000-000000000000",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(complexEmptySearch);

  TestValidator.equals(
    "data array should be empty for complex search criteria",
    complexEmptySearch.data.length,
    0,
  );

  TestValidator.equals(
    "complex search should return proper pagination",
    complexEmptySearch.pagination.records,
    0,
  );

  // 6. Validate empty search with different page numbers
  const page2EmptyResults =
    await api.functional.todoApp.admin.system.auditLogs.patch(connection, {
      body: {
        page: 2,
        limit: 10,
        search: "non_existent_search_term_xyz123",
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(page2EmptyResults);

  TestValidator.equals(
    "search page 2 should return empty results",
    page2EmptyResults.data.length,
    0,
  );

  TestValidator.equals(
    "pagination should show page 2 for empty results",
    page2EmptyResults.pagination.current,
    2,
  );

  TestValidator.equals(
    "total records should remain 0",
    page2EmptyResults.pagination.records,
    0,
  );
}
