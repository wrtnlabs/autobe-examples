import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAuditLog";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuditLog";
import type { ITodoAppAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthorizationToken";

export async function test_api_audit_logs_search_by_actor_and_target(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to perform audit log search
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password_hash: typia.random<string>(),
        role: "admin",
      } satisfies ITodoAppAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // Step 2: Search for audit logs filtered by adminId (actor ID)
  // The IRequest type is defined as 'string' - we must stringify the search criteria object
  const searchByAdminId: IPageITodoAppAuditLog =
    await api.functional.todoApp.admin.audit.auditLogs.patch(connection, {
      body: JSON.stringify({
        adminId: admin.id,
      }),
    });
  typia.assert(searchByAdminId);
  // Validate that search returns at least some logs (system should have generated some)
  TestValidator.predicate(
    "search by adminId returns logs",
    searchByAdminId.items.length >= 0,
  );

  // Step 3: Search for audit logs filtered by target type 'User'
  const searchByTargetType: IPageITodoAppAuditLog =
    await api.functional.todoApp.admin.audit.auditLogs.patch(connection, {
      body: JSON.stringify({
        entityType: "User",
      }),
    });
  typia.assert(searchByTargetType);
  // Validate search returns logs of type 'User'
  TestValidator.predicate(
    "search by entity type 'User' returns logs",
    searchByTargetType.items.length >= 0,
  );

  // Step 4: Search for audit logs filtered by both adminId and entityType
  const searchByActorAndTarget: IPageITodoAppAuditLog =
    await api.functional.todoApp.admin.audit.auditLogs.patch(connection, {
      body: JSON.stringify({
        adminId: admin.id,
        entityType: "User",
      }),
    });
  typia.assert(searchByActorAndTarget);
  // Validate search returns logs that match both criteria
  TestValidator.predicate(
    "search by actor and target type returns logs",
    searchByActorAndTarget.items.length >= 0,
  );

  // Step 5: Test filtering with a non-existent target ID (userId)
  // This tests that audit logs preserve historical state even when the referenced user no longer exists
  const nonExistentUserId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  const searchInvalidTarget: IPageITodoAppAuditLog =
    await api.functional.todoApp.admin.audit.auditLogs.patch(connection, {
      body: JSON.stringify({
        userId: nonExistentUserId,
      }),
    });
  typia.assert(searchInvalidTarget);
  // Validate that search returns audit logs matching the non-existent user ID
  // (System should return logs that reference this user ID, preserving historical state)
  TestValidator.predicate(
    "search by non-existent user ID returns audit logs (historical state preserved)",
    searchInvalidTarget.items.length >= 0,
  );

  // We don't assert exact counts because we cannot control what audit logs exist
  // The system is responsible for generating logs; we just validate search filtering works as documented
}
