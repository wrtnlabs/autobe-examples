import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAuditLog";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuditLog";

export async function test_api_audit_logs_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate an admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePassword123!";

  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ITodoAppAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // Validate admin authorization response structure
  TestValidator.equals("admin email matches request", admin.email, adminEmail);
  TestValidator.predicate(
    "admin token contains access and refresh credentials",
    admin.token.access.length > 0 && admin.token.refresh.length > 0,
  );

  // Step 2: Retrieve audit logs with pagination parameters
  const auditLogsResponse: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(auditLogsResponse);

  // Step 3: Validate pagination structure
  const { pagination, data } = auditLogsResponse;
  typia.assert<IPage.IPagination>(pagination);

  TestValidator.predicate(
    "pagination current page is 1",
    pagination.current === 1,
  );
  TestValidator.predicate("pagination limit is 20", pagination.limit === 20);
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );

  // Step 4: Validate pagination calculation
  const expectedPages = Math.ceil(pagination.records / pagination.limit);
  TestValidator.equals(
    "total pages calculated correctly as ceil(records/limit)",
    pagination.pages,
    expectedPages,
  );

  // Step 5: Validate data array structure
  TestValidator.predicate("data is an array", Array.isArray(data));

  // Step 6: Validate each audit log entry structure and content
  if (data.length > 0) {
    for (const auditLog of data) {
      typia.assert<ITodoAppAuditLog.ISummary>(auditLog);
    }

    // Step 7: Validate sort order (descending by created_at for reverse chronological)
    if (data.length > 1) {
      for (let i = 0; i < data.length - 1; i++) {
        const currentDate = new Date(data[i].created_at).getTime();
        const nextDate = new Date(data[i + 1].created_at).getTime();
        TestValidator.predicate(
          "audit logs are sorted in descending order by created_at",
          currentDate >= nextDate,
        );
      }
    }
  }

  // Step 8: Verify correct pagination state for empty results
  if (pagination.records === 0) {
    TestValidator.predicate(
      "data array is empty when no records exist",
      data.length === 0,
    );
    TestValidator.predicate(
      "pages is 0 when records is 0",
      pagination.pages === 0,
    );
  }
}
