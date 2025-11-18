import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";
import type { ITodoListAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAuditLog";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Ensure that an authenticated administrator can retrieve a specific audit log
 * entry by unique ID and verify the integrity and completeness of the
 * administrative event context. This covers system immutability and strict
 * authorization enforcement.
 *
 * 1. Register a new admin account using the admin join endpoint with random, valid
 *    data.
 * 2. Use the issued tokens/session to access the protected audit log endpoint.
 * 3. Retrieve a specific audit log entry by its unique id (using typia.random for
 *    uuid format).
 * 4. Assert the audit log structure and integrity: check admin actor, event type,
 *    event time, and, if present, target_user and details. All returned data
 *    must be immutable and match expected system integrity (e.g., timestamps
 *    are string/date-time, IDs are uuid, event_type is non-empty, actor matches
 *    admin summary structure).
 * 5. Confirm that an unauthenticated (no token) request is denied.
 */
export async function test_api_audit_log_admin_retrieval_by_id(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/",
    ip: typia.random<
      (string & tags.Format<"ipv4">) | (string & tags.Format<"ipv6">)
    >() satisfies string as string,
  } satisfies ITodoListAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminCreate,
  });
  typia.assert(adminAuth);

  // 2. Use authenticated admin to retrieve a specific audit log by uuid
  const testAuditLogId = typia.random<string & tags.Format<"uuid">>();
  const log = await api.functional.todoList.admin.auditLogs.at(connection, {
    auditLogId: testAuditLogId,
  });
  typia.assert(log);
  // Structure: id, admin, target_user, event_type, event_time, details
  TestValidator.predicate(
    "audit log id is correct uuid format",
    typeof log.id === "string" && log.id.length > 0,
  );
  typia.assert(log.admin);
  TestValidator.predicate(
    "admin summary structure valid",
    typeof log.admin.email === "string" &&
      typeof log.admin.display_name === "string",
  );
  TestValidator.predicate(
    "event_type is non-empty string",
    typeof log.event_type === "string" && log.event_type.length > 0,
  );
  TestValidator.predicate(
    "event_time is non-empty",
    typeof log.event_time === "string" && log.event_time.length > 0,
  );
  if (log.target_user !== null && log.target_user !== undefined) {
    typia.assert(log.target_user);
    TestValidator.predicate(
      "target_user structure valid",
      typeof log.target_user.email === "string" &&
        typeof log.target_user.display_name === "string",
    );
  }
  // details is optional
  if (log.details !== null && log.details !== undefined) {
    TestValidator.predicate(
      "details is string if exists",
      typeof log.details === "string",
    );
  }

  // 3. Attempt to retrieve audit log with unauthenticated connection - should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access is denied", async () => {
    await api.functional.todoList.admin.auditLogs.at(unauthConn, {
      auditLogId: testAuditLogId,
    });
  });
}
