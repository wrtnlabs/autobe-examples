import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminDeletionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminDeletionLog";

/**
 * Ensure a privileged admin can retrieve a specific admin deletion log entry by
 * unique admin and deletion log IDs, validating strict access control and
 * schema compliance.
 *
 * 1. Register/authenticate a new admin
 * 2. (Manual step) Assume deletion log exists for testing audit retrieval
 *    capabilities
 * 3. Attempt to fetch a deletion log for an arbitrary (valid-format) adminId and
 *    deletionLogId
 * 4. Validate that the returned result matches the ITodoListAdminDeletionLog type
 * 5. Check all sensitive/audit-critical fields are present according to schema
 * 6. Ensure that access is permitted for admins only (test does not check
 *    forbidden case, but could be extended for error path)
 */
export async function test_api_admin_deletion_log_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();
  const adminAuth: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ITodoListAdmin.IJoin,
    });
  typia.assert(adminAuth);
  // 2. Generate arbitrary UUIDs for adminId and deletionLogId (since log is created by separate system flow)
  const adminId = typia.random<string & tags.Format<"uuid">>();
  const deletionLogId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the admin deletion log -- since there is no API for creating logs, expect the result is either mock data (in simulate mode) or a 404 in real backend
  const deletionLog: ITodoListAdminDeletionLog =
    await api.functional.todoList.admin.admins.deletionLogs.at(connection, {
      adminId: adminId,
      deletionLogId: deletionLogId,
    });
  typia.assert(deletionLog);
  // 4. Validate all critical fields defined in the schema are present and properly typed
  TestValidator.predicate(
    "deletion log has valid id",
    typeof deletionLog.id === "string" && deletionLog.id.length > 0,
  );
  TestValidator.predicate(
    "deletion log has valid admin_id",
    typeof deletionLog.admin_id === "string" && deletionLog.admin_id.length > 0,
  );
  TestValidator.predicate(
    "deletion log has reason",
    typeof deletionLog.reason === "string" && deletionLog.reason.length > 0,
  );
  TestValidator.predicate(
    "deletion log has deleted_at timestamp",
    typeof deletionLog.deleted_at === "string" &&
      deletionLog.deleted_at.length > 0,
  );
}
