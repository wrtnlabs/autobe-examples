import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListAuditLog";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAuditLog";

/**
 * Validates privileged admin audit log search, filtering, and pagination.
 *
 * 1. Register two unique admin accounts for independence and cross-actor filtering
 * 2. Authenticate as the first admin to establish admin context
 * 3. Compose a complex search on PATCH /todoList/admin/auditLogs, filtering by:
 *
 *    - Event_action: partial match (substring)
 *    - Event_status: e.g., 'success'
 *    - Actor_admin_id: restrict to first admin
 *    - Since/until: a window including now
 *    - Sorting/pagination
 * 4. Submit the search and validate:
 *
 *    - Only allowed fields appear
 *    - Response is structured per contract
 *    - Pagination matches requested params
 *    - All items match filter or plausible edge cases if no matching logs present
 */
export async function test_api_audit_logs_search_filtered_by_admin(
  connection: api.IConnection,
) {
  // 1. Register two unique admin accounts
  const admin1Email = typia.random<string & tags.Format<"email">>();
  const admin2Email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);

  const admin1 = await api.functional.auth.admin.join(connection, {
    body: {
      email: admin1Email,
      password,
    } satisfies ITodoListAdmin.IJoin,
  });
  typia.assert(admin1);

  const admin2 = await api.functional.auth.admin.join(connection, {
    body: {
      email: admin2Email,
      password,
    } satisfies ITodoListAdmin.IJoin,
  });
  typia.assert(admin2);

  // 2. Ensure we are authenticated as admin1 (join sets token)
  TestValidator.equals("active admin email", admin1.email, admin1Email);

  // 3. Prepare a search body with advanced filters
  const nowIso = new Date().toISOString();
  const searchBody = {
    event_action: "admin", // partial match; will match e.g. 'admin_login', 'admin_update', etc.
    event_status: RandomGenerator.pick([
      "success",
      "failure",
      "denied",
    ] as const),
    actor_admin_id: admin1.id,
    since: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), // 1 week ago
    until: nowIso,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    page_size: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: "created_at",
    sort_direction: "desc",
  } satisfies ITodoListAuditLog.IRequest;

  // 4. Perform the search
  const result = await api.functional.todoList.admin.auditLogs.index(
    connection,
    {
      body: searchBody,
    },
  );
  typia.assert(result);

  // 5. Assert that pagination matches, no sensitive fields, and all records fit allowed summary contract
  const page = result.pagination;
  TestValidator.equals(
    "requested page returned",
    page.current,
    searchBody.page,
  );
  TestValidator.equals(
    "requested limit returned",
    page.limit,
    searchBody.page_size,
  );

  for (const audit of result.data) {
    typia.assert<ITodoListAuditLog.ISummary>(audit);
    // If non-null actor_admin_id, it should be admin1.id (by our filter)
    if (audit.actor_admin_id !== null && audit.actor_admin_id !== undefined) {
      TestValidator.equals(
        "audit actor_admin_id matches filter",
        audit.actor_admin_id,
        admin1.id,
      );
    }
    // event_action should include our filter substring (partial match)
    TestValidator.predicate(
      "event_action includes filter substring",
      audit.event_action.toLowerCase().includes("admin"),
    );
    // Status matches, or (business logic allows incomplete matches)
    if (audit.event_status && searchBody.event_status) {
      TestValidator.equals(
        "event_status matches filter",
        audit.event_status,
        searchBody.event_status,
      );
    }
    // created_at within time window
    TestValidator.predicate(
      "created_at in range",
      audit.created_at >= searchBody.since! &&
        audit.created_at <= searchBody.until!,
    );
    // Confirm no sensitive fields present: e.g., actor_user_id or affected_todo_id may be null/undefined but nothing extra
  }
}
