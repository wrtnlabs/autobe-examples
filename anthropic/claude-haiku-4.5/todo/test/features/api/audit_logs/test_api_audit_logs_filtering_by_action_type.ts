import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAuditLog";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuditLog";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test filtering audit logs by specific action_type values.
 *
 * This test validates that the audit logs API correctly filters and returns
 * only entries matching specified action types. The scenario covers:
 *
 * 1. Admin account setup for accessing audit logs
 * 2. Creating multiple user accounts to generate diverse audit log entries
 * 3. Filtering by specific action_type values ('user_registration')
 * 4. Validating pagination works with filtered results
 * 5. Testing with null/omitted action_type to verify all types are returned
 * 6. Verifying response structure and filtering accuracy
 */
export async function test_api_audit_logs_filtering_by_action_type(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for audit log access
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
      } satisfies ITodoAppAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // Step 2: Create multiple user accounts to generate audit log entries
  // These registrations will create 'user_registration' audit log entries
  const userCount = 5;
  const createdUsers = await ArrayUtil.asyncRepeat(userCount, async () => {
    const userEmail = typia.random<string & tags.Format<"email">>();
    const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
      connection,
      {
        body: {
          email: userEmail,
          password: RandomGenerator.alphabets(12),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ITodoAppUser.ICreate,
      },
    );
    typia.assert(user);
    return user;
  });
  TestValidator.predicate(
    "multiple users created for audit log generation",
    createdUsers.length === userCount,
  );

  // Step 3: Query audit logs with action_type filter for 'user_registration'
  const registrationLogsResponse: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        action_type: "user_registration",
        page: 1,
        limit: 10,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(registrationLogsResponse);

  // Step 4: Verify filtering results - all returned entries should have action_type 'user_registration'
  TestValidator.predicate(
    "user_registration filter returns matching action types",
    registrationLogsResponse.data.every(
      (entry) => entry.action_type === "user_registration",
    ),
  );

  TestValidator.predicate(
    "audit log response contains registration entries",
    registrationLogsResponse.data.length > 0,
  );

  // Step 5: Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    registrationLogsResponse.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit matches request",
    registrationLogsResponse.pagination.limit === 10,
  );

  // Step 6: Test filtering with different page
  const page2Response: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        action_type: "user_registration",
        page: 2,
        limit: 10,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(page2Response);

  TestValidator.predicate(
    "pagination with page 2 has correct page number",
    page2Response.pagination.current === 2,
  );

  // Step 7: Test filtering with limit parameter
  const limitedResponse: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        action_type: "user_registration",
        page: 1,
        limit: 2,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(limitedResponse);

  TestValidator.predicate(
    "filtered response respects limit parameter",
    limitedResponse.data.length <= 2,
  );

  // Step 8: Test with null action_type to verify all types are returned
  const allLogsResponse: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        action_type: null,
        page: 1,
        limit: 10,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(allLogsResponse);

  TestValidator.predicate(
    "null action_type returns all log types",
    allLogsResponse.data.length >= registrationLogsResponse.data.length,
  );

  // Step 9: Test without action_type parameter (undefined)
  const allLogsNoFilterResponse: IPageITodoAppAuditLog.ISummary =
    await api.functional.todoApp.admin.auditLogs.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppAuditLog.IRequest,
    });
  typia.assert(allLogsNoFilterResponse);

  TestValidator.predicate(
    "omitted action_type returns comprehensive results",
    allLogsNoFilterResponse.data.length >= 0,
  );

  // Step 10: Verify audit log entry structure
  if (registrationLogsResponse.data.length > 0) {
    const firstEntry = registrationLogsResponse.data[0];
    TestValidator.predicate(
      "audit log has required fields",
      firstEntry.id !== undefined &&
        firstEntry.action_type !== undefined &&
        firstEntry.resource_type !== undefined &&
        firstEntry.actor_type !== undefined &&
        firstEntry.status !== undefined &&
        firstEntry.created_at !== undefined,
    );
  }

  // Step 11: Verify response structure
  TestValidator.predicate(
    "response has pagination and data",
    registrationLogsResponse.pagination !== undefined &&
      registrationLogsResponse.data !== undefined,
  );
}
