import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAuditLog";

export async function test_api_shopping_mall_admin_audit_log_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user registration and authentication
  // Generate a random but valid admin join request body
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: `https://${RandomGenerator.alphaNumeric(8)}.com/admin/join`,
    referrer: `https://${RandomGenerator.alphaNumeric(8)}.com/admin`,
  } satisfies IShoppingMallAdmin.IJoin;

  // Perform admin join operation to authenticate and get authorized token
  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Prepare an audit log ID
  const auditLogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Retrieve the audit log entry by ID
  const auditLog: IShoppingMallAdminAuditLog =
    await api.functional.shoppingMall.admin.shoppingMallAdminAuditLogs.at(
      connection,
      {
        id: auditLogId,
      },
    );
  typia.assert(auditLog);

  // 4. Validate the audit log data
  TestValidator.equals("audit log id matches request", auditLog.id, auditLogId);
  TestValidator.predicate(
    "audit log has valid shopping mall admin UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      auditLog.shopping_mall_admin_id,
    ),
  );
  TestValidator.predicate(
    "audit log action_type non-empty string",
    typeof auditLog.action_type === "string" && auditLog.action_type.length > 0,
  );
  TestValidator.predicate(
    "audit log resource_type non-empty string",
    typeof auditLog.resource_type === "string" &&
      auditLog.resource_type.length > 0,
  );
  // resource_id is nullable
  TestValidator.predicate(
    "audit log success is boolean",
    typeof auditLog.success === "boolean",
  );
  // details is nullable
  if (auditLog.details !== null && auditLog.details !== undefined) {
    try {
      JSON.parse(auditLog.details);
      TestValidator.predicate("audit log details string is valid JSON", true);
    } catch {
      TestValidator.predicate(
        "audit log details string is invalid JSON",
        false,
      );
    }
  }
  TestValidator.predicate(
    "audit log created_at is ISO date-time string",
    typeof auditLog.created_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z$/.test(auditLog.created_at),
  );
}
