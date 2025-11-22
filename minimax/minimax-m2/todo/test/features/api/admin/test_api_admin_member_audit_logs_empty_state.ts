import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAuditLog";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import type { ITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuditLog";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";

/**
 * Test audit log retrieval for member with no activity history.
 *
 * Create new member with minimal activity and verify empty audit log response.
 * Validates proper handling of new accounts without generated audit trail and
 * ensures empty state responses are properly formatted.
 */
export async function test_api_admin_member_audit_logs_empty_state(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for accessing member audit logs
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: typia.random<string>(),
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role_level: "admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create member account with minimal activity
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ITodoAppMember.IAuthorized =
    await api.functional.auth.member.join.registerMember(connection, {
      body: {
        email: memberEmail,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies ITodoAppMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create member profile (minimal activity)
  const memberProfile: ITodoAppMember =
    await api.functional.todoApp.member.members.create(connection, {
      body: {
        email: memberEmail,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies ITodoAppMember.ICreate,
    });
  typia.assert(memberProfile);

  // Step 4: Login as admin to access member audit logs
  const adminLogin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: typia.random<string>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppAdministrator.ILogin,
    });
  typia.assert(adminLogin);

  // Step 5: Retrieve audit logs for the newly created member (should be empty)
  const auditLogsPage: IPageITodoAppAuditLog =
    await api.functional.todoApp.admin.members.auditLogs.at(connection, {
      memberId: memberProfile.id,
    });
  typia.assert(auditLogsPage);

  // Step 6: Validate empty state response
  TestValidator.equals(
    "audit logs should be empty for new member",
    auditLogsPage.data,
    [],
  );

  TestValidator.equals(
    "pagination should show zero total records",
    auditLogsPage.pagination.records,
    0,
  );

  TestValidator.equals(
    "current page should be 0",
    auditLogsPage.pagination.current,
    0,
  );

  TestValidator.equals(
    "total pages should be 0",
    auditLogsPage.pagination.pages,
    0,
  );

  TestValidator.predicate(
    "empty data array should have length 0",
    auditLogsPage.data.length === 0,
  );
}
