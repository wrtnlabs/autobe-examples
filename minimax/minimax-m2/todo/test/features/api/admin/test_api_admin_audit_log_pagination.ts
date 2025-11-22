import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAuditLog";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import type { ITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuditLog";

export async function test_api_admin_audit_log_pagination(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to create initial session and generate audit logs
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "AdminTest123!";

  const adminAuth: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        first_name: "Test",
        last_name: "Admin",
        role_level: "admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(adminAuth);

  // Step 2: Create multiple administrator accounts to generate substantial audit log volume
  const createdAdmins: ITodoAppAdministrator[] = [];
  const numAdmins = 8; // Create 8 administrators to generate significant audit trail

  for (let i = 0; i < numAdmins; i++) {
    const newAdminEmail: string = typia.random<string & tags.Format<"email">>();
    const admin: ITodoAppAdministrator =
      await api.functional.todoApp.administrators.create(connection, {
        body: {
          email: newAdminEmail,
          password_hash: adminPassword,
          first_name: `Admin${i}`,
          last_name: "User",
          role_level: i % 2 === 0 ? "admin" : "moderator",
          status: "active",
        } satisfies ITodoAppAdministrator.ICreate,
      });
    typia.assert(admin);
    createdAdmins.push(admin);
  }

  // Step 3: Test pagination with various page sizes and validate pagination implementation
  const pageSizes = [1, 2, 3, 5]; // Test multiple page sizes
  const totalExpectedRecords = numAdmins + 1; // Initial admin + created admins

  for (const pageSize of pageSizes) {
    const expectedTotalPages = Math.ceil(totalExpectedRecords / pageSize);

    // Test first page retrieval
    const firstPageResult: IPageITodoAppAuditLog =
      await api.functional.todoApp.admin.administrators.auditLogs.index(
        connection,
        {
          administratorId: adminAuth.id,
        },
      );
    typia.assert(firstPageResult);

    // Validate pagination metadata
    TestValidator.equals(
      "first page current index",
      firstPageResult.pagination.current,
      0,
    );
    TestValidator.equals(
      "first page limit matches request",
      firstPageResult.pagination.limit,
      pageSize,
    );
    TestValidator.equals(
      "total records count",
      firstPageResult.pagination.records,
      totalExpectedRecords,
    );
    TestValidator.equals(
      "total pages calculation",
      firstPageResult.pagination.pages,
      expectedTotalPages,
    );
    TestValidator.equals(
      "data array length matches page size",
      firstPageResult.data.length,
      Math.min(pageSize, totalExpectedRecords),
    );

    // Validate that we have actual audit log data
    TestValidator.predicate(
      "audit logs data exists",
      firstPageResult.data.length > 0,
    );

    // Test edge case: page size larger than total records
    if (pageSize > totalExpectedRecords) {
      TestValidator.equals(
        "all records on single page",
        firstPageResult.data.length,
        totalExpectedRecords,
      );
    }
  }

  // Step 4: Validate audit log content and administrative activity tracking
  const fullAuditResult: IPageITodoAppAuditLog =
    await api.functional.todoApp.admin.administrators.auditLogs.index(
      connection,
      {
        administratorId: adminAuth.id,
      },
    );
  typia.assert(fullAuditResult);

  // Verify comprehensive audit trail
  TestValidator.predicate(
    "comprehensive audit logs exist",
    fullAuditResult.data.length >= totalExpectedRecords,
  );

  // Validate audit log structure and content
  for (const auditLog of fullAuditResult.data) {
    TestValidator.predicate("audit log has valid ID", auditLog.id.length > 0);
    TestValidator.predicate(
      "audit log has action type",
      auditLog.action_type.length > 0,
    );
    TestValidator.predicate(
      "audit log has entity type",
      auditLog.entity_type.length > 0,
    );
    TestValidator.predicate(
      "audit log has description",
      auditLog.action_description.length > 0,
    );
    TestValidator.predicate(
      "audit log has timestamp",
      auditLog.created_at.length > 0,
    );
  }

  // Verify administrative activities are captured
  const adminCreationLogs = fullAuditResult.data.filter(
    (log) =>
      log.entity_type === "administrator" ||
      log.action_description.toLowerCase().includes("administrator") ||
      log.action_description.toLowerCase().includes("admin"),
  );
  TestValidator.predicate(
    "administrative creation activities logged",
    adminCreationLogs.length > 0,
  );

  // Verify actor tracking
  const actorLogs = fullAuditResult.data.filter(
    (log) => log.actor_administrator_id === adminAuth.id,
  );
  TestValidator.predicate(
    "admin actions properly attributed to actor",
    actorLogs.length > 0,
  );
}
