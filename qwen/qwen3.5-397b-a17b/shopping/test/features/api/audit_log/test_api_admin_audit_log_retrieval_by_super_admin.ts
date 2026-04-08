import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAuditLog";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super administrator retrieval of administrator audit log by UUID.
 *
 * Validates that a super administrator can successfully retrieve a specific administrator audit log entry using its unique identifier. The test ensures proper authentication, complete response structure validation, and verifies that all audit log fields contain valid data for compliance and forensic analysis purposes.
 *
 * The audit log retrieval endpoint provides complete accountability information including the administrator who performed the action, the type of action taken, the target entity affected, and contextual metadata such as IP address and user agent. This test validates the entire response structure against the IShoppingMallAdminAuditLog type definition.
 *
 * 1. Super administrator registers and authenticates using join endpoint.
 * 2. Generates a valid UUID for audit log retrieval.
 * 3. Calls GET /shoppingMall/superAdmin/admin/audit-logs/{auditLogId} with authenticated connection.
 * 4. Validates response structure using typia.assert().
 * 5. Verifies audit log ID matches the requested identifier.
 * 6. Confirms admin relation is properly populated with administrator details.
 */
export async function test_api_admin_audit_log_retrieval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Generate audit log ID for retrieval
  const auditLogId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve audit log by UUID
  const auditLog =
    await api.functional.shoppingMall.superAdmin.admin.audit_logs.at(
      superAdminConnection,
      {
        auditLogId: auditLogId,
      },
    );
  typia.assert(auditLog);
  // 4. Validate audit log ID matches request
  TestValidator.equals("audit log id matches request", auditLog.id, auditLogId);
  // 5. Validate admin relation is populated
  TestValidator.predicate(
    "admin relation exists",
    () => auditLog.admin !== null,
  );
  TestValidator.equals("admin id matches", auditLog.admin.id !== null, true);
  // 6. Validate member profile in admin relation
  TestValidator.predicate(
    "admin member profile exists",
    () => auditLog.admin.member !== null,
  );
}
