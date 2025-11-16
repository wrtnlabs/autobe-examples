import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuditLog";

/**
 * Validate audit log detail retrieval for admin users.
 *
 * This test registers a platform admin, simulates audit log existence, and
 * checks:
 *
 * 1. An authenticated admin can retrieve detail for a known audit log id
 * 2. The response structure contains all compliance, risk, and actor metadata
 * 3. Error is raised for non-existent audit log id
 * 4. Unauthenticated/unauthorized requests are rejected
 */
export async function test_api_audit_log_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register new admin and authenticate
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuth);

  // 2. Mock an audit log record to obtain a valid id (since there is no API to create/search audit logs)
  const auditLog: IShoppingMallAuditLog = typia.random<IShoppingMallAuditLog>();
  typia.assert(auditLog);

  // 3. Retrieve audit log detail by id as admin
  const fetched: IShoppingMallAuditLog =
    await api.functional.shoppingMall.admin.auditLogs.at(connection, {
      id: auditLog.id,
    });
  typia.assert(fetched);
  TestValidator.equals(
    "retrieved id matches requested log",
    fetched.id,
    auditLog.id,
  );
  TestValidator.predicate("risk_level present", !!fetched.risk_level);
  TestValidator.predicate("compliance_tag present", !!fetched.compliance_tag);
  TestValidator.predicate("audit_detail present", !!fetched.audit_detail);
  TestValidator.predicate("change_type present", !!fetched.change_type);
  TestValidator.predicate("created_at present", !!fetched.created_at);
  // At least one actor id should be present or null
  TestValidator.predicate(
    "at least one actor id is defined",
    (fetched.actor_admin_id !== null && fetched.actor_admin_id !== undefined) ||
      (fetched.actor_seller_id !== null &&
        fetched.actor_seller_id !== undefined) ||
      (fetched.actor_customer_id !== null &&
        fetched.actor_customer_id !== undefined),
  );

  // 4. Try fetching with a non-existent id (should error)
  const unknownAuditId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should error for unknown audit log id",
    async () => {
      await api.functional.shoppingMall.admin.auditLogs.at(connection, {
        id: unknownAuditId,
      });
    },
  );

  // 5. Try fetching detail with unauthenticated (no token) connection (should error)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "should error if not authenticated as admin",
    async () => {
      await api.functional.shoppingMall.admin.auditLogs.at(unauthConn, {
        id: auditLog.id,
      });
    },
  );
}
