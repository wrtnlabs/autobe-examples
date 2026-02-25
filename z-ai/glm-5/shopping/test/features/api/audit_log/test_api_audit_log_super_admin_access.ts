import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAuditLog";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that a super administrator can retrieve any audit log record
 * regardless of which administrator performed the action.
 *
 * Setup:
 * 1. Create a seller account
 * 2. Create a regular admin who will approve the seller
 * 3. Regular admin approves the seller (creates audit log)
 * 4. Both admins retrieve the audit log to verify access
 *
 * Validation:
 * - Audit log contains complete information with correct action type
 * - Admin summary shows the regular admin's identification
 * - Audit log accurately captures the administrative action
 */
export async function test_api_audit_log_super_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account for approval workflow
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Create regular admin (will perform approval action)
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdminAuth = await authorize_admin_join(regularAdminConnection, {
    body: {
      name: RandomGenerator.name(),
    },
  });
  typia.assert(regularAdminAuth);
  // 3. Create super admin (for cross-admin audit log access verification)
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_admin_join(superAdminConnection, {
    body: {
      name: RandomGenerator.name(),
    },
  });
  typia.assert(superAdminAuth);
  // 4. Regular admin approves the seller - creates audit log entry
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(
      regularAdminConnection,
      {
        sellerId: sellerAuth.id,
      },
    );
  typia.assert(approvedSeller);
  // Validate seller approval succeeded
  TestValidator.equals(
    "seller approval status",
    approvedSeller.approvalStatus,
    "approved",
  );
  TestValidator.equals("seller id matches", approvedSeller.id, sellerAuth.id);
  TestValidator.equals(
    "seller email preserved",
    approvedSeller.email,
    sellerAuth.email,
  );
  // 5. Regular admin retrieves their own audit log
  const regularAdminAuditLog =
    await api.functional.shoppingMall.admin.audit_logs.at(
      regularAdminConnection,
      {
        auditLogId: sellerAuth.id,
      },
    );
  typia.assert(regularAdminAuditLog);
  // Validate audit log structure
  TestValidator.equals(
    "audit log action",
    regularAdminAuditLog.action,
    "seller_approve",
  );
  TestValidator.equals(
    "audit log target type",
    regularAdminAuditLog.target_type,
    "seller",
  );
  TestValidator.equals(
    "audit log target id",
    regularAdminAuditLog.target_id,
    sellerAuth.id,
  );
  TestValidator.predicate(
    "audit log has ip",
    regularAdminAuditLog.ip.length > 0,
  );
  TestValidator.predicate(
    "audit log has timestamp",
    regularAdminAuditLog.created_at.length > 0,
  );
  // Validate admin summary in audit log
  TestValidator.equals(
    "admin id in audit log",
    regularAdminAuditLog.admin.id,
    regularAdminAuth.id,
  );
  TestValidator.equals(
    "admin email in audit log",
    regularAdminAuditLog.admin.email,
    regularAdminAuth.email,
  );
  // 6. Super admin retrieves the same audit log (cross-admin access)
  const superAdminAuditLog =
    await api.functional.shoppingMall.admin.audit_logs.at(
      superAdminConnection,
      {
        auditLogId: sellerAuth.id,
      },
    );
  typia.assert(superAdminAuditLog);
  // Validate super admin sees consistent audit log data
  TestValidator.equals(
    "audit log id consistent",
    superAdminAuditLog.id,
    regularAdminAuditLog.id,
  );
  TestValidator.equals(
    "action type consistent",
    superAdminAuditLog.action,
    "seller_approve",
  );
  TestValidator.equals(
    "target type consistent",
    superAdminAuditLog.target_type,
    "seller",
  );
  TestValidator.equals(
    "target id consistent",
    superAdminAuditLog.target_id,
    sellerAuth.id,
  );
  // Verify audit log shows the regular admin performed the action
  TestValidator.equals(
    "audit log actor is regular admin",
    superAdminAuditLog.admin.id,
    regularAdminAuth.id,
  );
  TestValidator.equals(
    "audit log actor email",
    superAdminAuditLog.admin.email,
    regularAdminAuth.email,
  );
  // Verify both admins see the same audit log content
  TestValidator.equals(
    "ip address matches",
    superAdminAuditLog.ip,
    regularAdminAuditLog.ip,
  );
  TestValidator.equals(
    "created timestamp matches",
    superAdminAuditLog.created_at,
    regularAdminAuditLog.created_at,
  );
}
